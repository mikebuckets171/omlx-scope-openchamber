import Foundation
import Darwin
import IOKit.ps
import ScopeCore

/// Public Mach, sysctl and IOPowerSources APIs. No subprocesses or private sensors.
actor HostSampler {
    private var previousCPU: [UInt64]?
    private var lastCPUAt: TimeInterval = 0
    private var powerAt = -Double.infinity
    private var power: (Double?, String?) = (nil, nil)
    private let port: mach_port_t = mach_host_self()
    deinit { mach_port_deallocate(mach_task_self_, port) }

    func sample() -> HostReading {
        let now = ProcessInfo.processInfo.systemUptime
        var result = HostReading()
        result.totalBytes = Double(ProcessInfo.processInfo.physicalMemory)
        var cpu = host_cpu_load_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<host_cpu_load_info_data_t>.size / MemoryLayout<integer_t>.size)
        let cpuStatus = withUnsafeMutablePointer(to: &cpu) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics(port, HOST_CPU_LOAD_INFO, $0, &count)
            }
        }
        if cpuStatus == KERN_SUCCESS {
            let ticks = [cpu.cpu_ticks.0, cpu.cpu_ticks.1, cpu.cpu_ticks.2, cpu.cpu_ticks.3].map(UInt64.init)
            result.cpu = SamplingPolicy.cpuPercent(previous: now - lastCPUAt > 35 ? nil : previousCPU, current: ticks)
            previousCPU = ticks; lastCPUAt = now
        } else { previousCPU = nil }
        var memory = vm_statistics64_data_t()
        var memoryCount = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        var pageSize: vm_size_t = 0
        let pageStatus = host_page_size(port, &pageSize)
        let memoryStatus = withUnsafeMutablePointer(to: &memory) { pointer in
            pointer.withMemoryRebound(to: integer_t.self, capacity: Int(memoryCount)) {
                host_statistics64(port, HOST_VM_INFO64, $0, &memoryCount)
            }
        }
        if pageStatus == KERN_SUCCESS && memoryStatus == KERN_SUCCESS && pageSize > 0 {
            let free = Double(memory.free_count) * Double(pageSize)
            if let total = result.totalBytes, free <= total { result.nonFreeBytes = total - free }
            result.wiredBytes = Double(memory.wire_count) * Double(pageSize)
            result.compressedBytes = Double(memory.compressor_page_count) * Double(pageSize)
        }
        var swap = xsw_usage()
        var swapSize = MemoryLayout<xsw_usage>.size
        if sysctlbyname("vm.swapusage", &swap, &swapSize, nil, 0) == 0 { result.swapBytes = Double(swap.xsu_used) }
        result.lowPower = ProcessInfo.processInfo.isLowPowerModeEnabled
        switch ProcessInfo.processInfo.thermalState {
        case .nominal: result.thermal = "Nominal"
        case .fair: result.thermal = "Fair"
        case .serious: result.thermal = "Serious"
        case .critical: result.thermal = "Critical"
        @unknown default: result.thermal = nil
        }
        if now - powerAt >= 30 { power = Self.readPower(); powerAt = now }
        result.batteryPercent = power.0; result.powerSource = power.1
        return result
    }

    private static func readPower() -> (Double?, String?) {
        guard let info = IOPSCopyPowerSourcesInfo()?.takeRetainedValue() else { return (nil, nil) }
        let source = IOPSGetProvidingPowerSourceType(info)?.takeUnretainedValue() as String?
        let name = source == kIOPMACPowerKey ? "Power adapter" : source == kIOPMBatteryPowerKey ? "Battery" : nil
        guard let list = IOPSCopyPowerSourcesList(info)?.takeRetainedValue() as? [CFTypeRef] else { return (nil, name) }
        for item in list {
            guard let description = IOPSGetPowerSourceDescription(info, item)?.takeUnretainedValue() as? [String: Any],
                  description[kIOPSTypeKey] as? String == kIOPSInternalBatteryType,
                  let capacity = description[kIOPSCurrentCapacityKey] as? Double,
                  let maximum = description[kIOPSMaxCapacityKey] as? Double, maximum > 0,
                  capacity >= 0, capacity <= maximum else { continue }
            return (capacity / maximum * 100, name)
        }
        return (nil, name)
    }
}

# Third-party notices

## OpenChamber SDK

The bundled panel uses `@openchamber/sdk` 1.24.0, licensed under the MIT
License.

Copyright (c) 2025 Bohdan Triapitsyn

## Zod

The OpenChamber SDK depends on Zod 4.6.5, licensed under the MIT License.

Copyright (c) 2025 Colin McDonnell

## JSONC Parser

The bundled service uses `jsonc-parser` 3.3.1, licensed under the MIT License.

Copyright (c) Microsoft

The full MIT license text for these dependencies is reproduced below:

> Permission is hereby granted, free of charge, to any person obtaining a copy
> of this software and associated documentation files (the "Software"), to deal
> in the Software without restriction, including without limitation the rights
> to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
> copies of the Software, and to permit persons to whom the Software is
> furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all
> copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
> IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
> FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
> AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
> LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
> OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
> SOFTWARE.


## Sparkle (native Mac app only)

Sparkle 2.10.0 provides the standard signed-update mechanism. It is pinned to an
exact release in SwiftPM; that release’s manifest pins its binary SHA-256.
The complete upstream license and bundled-component notices are copied into
`OMLX Scope.app/Contents/Resources/Sparkle-LICENSE.txt` during packaging.

Source and license: https://github.com/sparkle-project/Sparkle/tree/2.10.0

The OpenChamber extension does not include Sparkle.

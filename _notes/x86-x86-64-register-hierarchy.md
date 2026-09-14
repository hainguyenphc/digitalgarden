---
title: "x86 and x86-64 Register Hierarchy: AL, AH, AX, EAX, RAX"
date: 2026-09-14
tags: [assembly, x86, x86-64, computer-architecture]
---

# x86 and x86-64 Register Hierarchy: AL, AH, AX, EAX, RAX

I kept mixing these up, so here's the version I wish someone had just told me straight up.

Registers live inside the CPU itself — they're the fastest storage a processor has, since it doesn't have to go fetch anything from RAM. AL, AH, AX, EAX, and RAX aren't five different registers. They're five different *views* of the same general-purpose register, just at different sizes. "General-purpose" here just means it's not locked into one specific job the way, say, the instruction pointer is — but by convention this particular register gets used as the "accumulator" for arithmetic and return values.

Also worth clearing up upfront: "x86" technically means the 32-bit lineage (and its 16-bit ancestors, going back to the 8086). The 64-bit extension is its own thing, properly called **x86-64** (AMD calls it AMD64, Intel calls its version Intel 64, Windows folks just say "x64"). So this post is really about both — the 32-bit chain and its 64-bit extension.

## How it nests

Think of it like Russian nesting dolls, where each size is just a slice of the next one up.

| Register | Bits    | Size    | Notes                          |
|----------|---------|---------|---------------------------------|
| `AL`     | 0–7     | 8-bit   | low byte of AX                  |
| `AH`     | 8–15    | 8-bit   | high byte of AX                 |
| `AX`     | 0–15    | 16-bit  | AH and AL stuck together         |
| `EAX`    | 0–31    | 32-bit  | "Extended" AX — exists in both 32-bit and 64-bit mode |
| `RAX`    | 0–63    | 64-bit  | the full register in 64-bit mode; EAX is just its bottom half |

So the chain is:

```
AL/AH ⊂ AX ⊂ EAX ⊂ RAX
```

I originally assumed EAX just gets swapped out for RAX once you're in 64-bit mode. Nope — EAX is still there, it's just demoted to "the bottom 32 bits of RAX" instead of being the top-level register.

## The part that has no name

AL and AH only carve up the bottom 16 bits (AX) into two bytes. There's no equivalent split for the upper 16 bits of EAX, or the upper 32 bits of RAX — those bits don't get their own register name. If you need to touch them, you're operating on the whole EAX/RAX or doing it with shifts.

## The gotcha in 64-bit mode

This one actually tripped me up: if you write to **EAX**, the CPU automatically zero-extends the result and wipes out the upper 32 bits of RAX. Writing to AX or AL/AH doesn't do this — those leave the rest of the register alone.

```asm
mov rax, 0xFFFFFFFFFFFFFFFF   ; RAX = all 1s
mov eax, 1                    ; RAX = 0x0000000000000001, upper bits cleared
mov ax, 1                     ; only bits 0-15 change, rest of RAX untouched
```

This is a quirk specific to the 32-bit-writes-into-64-bit-register situation — it wasn't a thing back when EAX was the top-level register in pure 32-bit mode.

## Same deal for the other general-purpose registers

I used AX as the example because it's the accumulator, but this nesting pattern isn't unique to it. The other general-purpose registers follow the exact same structure — BX, CX, DX all split the same way:

| 8-bit low | 8-bit high | 16-bit | 32-bit | 64-bit |
|-----------|------------|--------|--------|--------|
| `AL`      | `AH`       | `AX`   | `EAX`  | `RAX`  |
| `BL`      | `BH`       | `BX`   | `EBX`  | `RBX`  |
| `CL`      | `CH`       | `CX`   | `ECX`  | `RCX`  |
| `DL`      | `DH`       | `DX`   | `EDX`  | `RDX`  |

Same rules apply across the board: each size is just a slice of the next one up, the upper 16/32 bits above AX/EAX-equivalent have no dedicated name, and writing to the 32-bit form (e.g. `EBX`) zero-extends and clears the upper 32 bits of the 64-bit form (`RBX`) in 64-bit mode.

## Why you'd actually care

- **AL** is the implicit operand for byte-sized `MUL`, `DIV`, `IMUL`.
- **EAX** is the return-value register under the cdecl calling convention, and the default operand for 32-bit arithmetic instructions.
- **EAX** also carries the syscall number on 32-bit Linux (`mov eax, 1` for `sys_exit`, for example).
- **RAX** inherits these jobs in 64-bit code — syscall number on x86-64 Linux, 64-bit return values, etc.

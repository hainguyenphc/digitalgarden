---
title: "The Memory Controller Chip (MCC): How Does a CPU Actually Talk to RAM?"
date: 2026-09-14
collection: notes
tags: [computer-architecture, hardware, cs-fundamentals]
category: cpu
---

> Working notes — I'm learning this as I go, so if something here is slightly off, that's on me, not on computer architecture.

So I've been going down a bit of a rabbit hole trying to actually understand what's happening when a CPU reads from or writes to RAM. Not the "CPU sends a request, RAM sends back data" hand-wavy version — I mean the actual wires. Here's what I've pieced together.

## The Memory Controller Chip (MCC)

First thing: the CPU doesn't talk to RAM directly. There's a **Memory Controller Chip (MCC)** sitting between them, and the CPU talks to *that*. Makes sense once you think about it — RAM has its own timing and protocol requirements, and you don't want the CPU babysitting all of that.

The CPU connects to the MCC through a few different buses, and at first I only really registered one of them: the **data bus**.

## Wait, Why Do We Need an Address Bus Too?

This is the part that tripped me up. If the CPU has a data bus to grab data off RAM, why does it *also* need a separate address bus?

The answer is kind of obvious in hindsight: RAM isn't one single blob of storage. It's basically a giant array — millions (or billions) of individually addressable storage locations. If the CPU only had a data bus, it could say "give me some data" but it would have **no way of specifying which location** it wants.

So you actually need two buses doing two completely different jobs:

- **Address bus** → the "where." Carries the location you want, like `RAM[0x1000A4]`.
- **Data bus** → the "what." Carries the actual value, either coming back (read) or going in (write).

Think of it like `x = RAM[42]`. The `42` has to physically get transmitted somehow — that's the address bus's whole job. The data bus then carries back whatever's sitting at `RAM[42]`. Without the address bus, the CPU is just yelling "gimme data" into the void with no way to say *which* data.

(There's also a third one, the **control bus**, carrying signals like read/write and clock sync. Address + data + control together is what people mean when they just say "the bus.")

## What "Width" Actually Means

Here's the satisfying part: the width of a bus is literally just **the number of physical wires it has.**

Each wire is either high voltage (1) or low voltage (0) at any given moment. So an *n*-bit bus can represent 2ⁿ distinct combinations at once. That's it — no more abstract than that.

For the **address bus** specifically:

$$\text{width of address bus} = \log_2(\text{number of addressable memory locations})$$

Some examples that made this click for me:
- 20-bit address bus → 2²⁰ = 1,048,576 locations = 1 MB addressable
- 32-bit address bus → 2³² locations = 4 GB addressable
- 64-bit address bus → 2⁶⁴ locations (though in practice, real 64-bit CPUs usually only physically wire up ~48 address lines — you don't need the full theoretical range yet)

This also explains something I'd just accepted without understanding before: **why 32-bit systems cap out around 4GB of RAM.** It's not arbitrary — it's a direct consequence of only having 32 wires to specify an address with.

## Case Study: The Intel 8088

To make this concrete, I looked at the 8088, since it's a nice, well-documented example with a bit of a quirky story.

- **Address bus:** 20-bit → 1 MB addressable
- **External data bus:** 8-bit
- **Internal registers:** 16-bit

The 8-bit vs 20-bit mismatch is the interesting bit. Address and data bus widths *don't have to match* — and usually don't. The 8088 was Intel's cost-cut version of the 8086: same 16-bit internal architecture, same 20-bit address bus (so identical 1 MB address space), but they shrunk the external data bus down to 8 bits. Cheaper support chips, cheaper motherboards. This is literally why IBM picked the 8088 for the original IBM PC.

One catch: 16-bit registers can't directly hold a 20-bit address. So the 8086/8088 used **segmented addressing** — a segment register and an offset register combine as `segment × 16 + offset` to produce the full 20-bit physical address. That's where the classic `segment:offset` notation in x86 assembly comes from. It's not an arbitrary design choice — it's a direct workaround for "register width < address bus width."

## RAM Doesn't Care If It's Code or Data

Last thing that clicked for me: RAM holds **both program instructions and data**, and at the hardware level they are *completely indistinguishable*. A byte is just a byte. It only becomes an "instruction" or "data" based on how the CPU decides to fetch and interpret it during the fetch-decode-execute cycle — instructions get fetched via the instruction pointer, data gets fetched via an operand address.

This is the **von Neumann architecture** — one unified memory for both code and data. Two things fall directly out of this:

1. **This is the root cause of buffer overflow exploits.** If an attacker can get their bytes written into a region of memory that later gets executed as instructions, they've effectively turned "data" into "code" at runtime.
2. The alternative is **Harvard architecture** — physically separate memory and buses for instructions vs. data, used in a lot of microcontrollers/DSPs. Most general-purpose CPUs (x86 included) are von Neumann at the RAM level, but "modified Harvard" internally — separate L1 instruction and data caches sitting in front of a unified RAM.

## Takeaway

The address bus and data bus aren't redundant — they're answering two different questions every single memory access needs answered: *where* and *what*. And "width" is refreshingly literal: it's just wire count, which caps how much address space or data you can move per cycle. The 8088 is a good reminder that these widths are independent design knobs, not a package deal.

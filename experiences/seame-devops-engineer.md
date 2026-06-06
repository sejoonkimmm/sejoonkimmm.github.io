---
title: "Sejoon Kim as a DevOps Engineer (Open Source Contributor)"
organization: "SEA:ME"
role: "DevOps Engineer, Open Source Contributor"
period: "July 2024 - December 2024"
location: "Wolfsburg, Germany"
description: "Open-source contributor on SEA:ME, a Volkswagen-sponsored in-vehicle infotainment project. Built the containerized ARM cross-compilation pipeline and CI that cut first-build onboarding from 1-2 days to 1-2 hours."
logo: "/logos/volkswagen.svg"
tags: ["Automotive", "Build Systems", "CI/CD", "Docker", "Embedded"]
---

# DevOps Engineer (Open Source Contributor) - SEA:ME

Build engineering and developer experience for an in-vehicle infotainment project running on real hardware.

## About SEA:ME

SEA:ME (Software Engineering in Automotive and Mobility Ecosystems) is a Volkswagen-sponsored, project-based program in Wolfsburg. Teams build automotive software against actual hardware: Raspberry Pi-based PiRacer dev kits running infotainment workloads, not simulators.

## What I actually did

I owned the build and CI side of a C++ / Qt 6 infotainment project targeting ARM. The problem I walked into: every new contributor lost their first day or two fighting toolchains. The project had to cross-compile for ARM, and every host OS (macOS, Linux, Windows/WSL) broke in its own way.

### Containerized cross-compilation pipeline

I packaged the entire toolchain (CMake, C++ / Qt 6, ARM cross-toolchain) into Docker, with QEMU user-mode emulation so contributors on x86 machines could actually execute the ARM binaries they built. One `docker run` replaced a page of host-specific setup instructions.

First-build onboarding dropped from 1-2 days to 1-2 hours, roughly a 90% cut, and it worked the same on macOS, Linux, and WSL.

### CI for ARM targets

I built GitHub Actions CI targeting ARM Raspberry Pi OS, with build-artifact caching (actions/cache) and Docker BuildKit layer caching so pull requests didn't pay for cold rebuilds every time.

QEMU emulation in CI had a second benefit: contributors without the physical dev kit still got a full integration test loop on every PR.

### Release packaging and deployment

Release artifacts went out as versioned tarballs deployed to the PiRacer (the Raspberry Pi-based VW dev kit) for validation on the real target.

### Knowledge transfer

I led two contributor training sessions on the cross-compilation toolchain and the embedded build flow, and documented the setup so the playbook outlived my contribution window. That last part mattered to me: open-source infrastructure that dies when its author leaves is just a demo.

## Technologies used

- **Build**: CMake, C++ / Qt 6, ARM cross-toolchain
- **Containers**: Docker, BuildKit
- **Emulation**: QEMU (user-mode)
- **CI/CD**: GitHub Actions, actions/cache
- **Target**: Raspberry Pi OS (ARM), PiRacer dev kit

## What it taught me

Working close to hardware changed how I think about infrastructure. When your deployment target is a physical device on a desk in Wolfsburg, "works on my machine" is not a joke, it is the entire problem statement. The fix is the same one that works in cloud infrastructure: reproducible environments, aggressive caching, and documentation good enough that you become unnecessary.

This experience is also why I kept choosing developer-tooling work afterwards. Watching onboarding drop from days to hours convinced me that the highest-impact engineering is often the kind nobody outside the team ever sees.

#!/bin/bash
sed -i 's/pub mod rbac;/pub mod rbac;\npub mod license_manager;/' omni_med_nexus_os/core_engine/src/lib.rs
sed -i 's/pub use crate::rbac::\*;/pub use crate::rbac::\*;\npub use crate::license_manager::\*;\n/' omni_med_nexus_os/core_engine/src/api.rs

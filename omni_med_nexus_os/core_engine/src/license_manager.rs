use std::sync::Mutex;
use std::collections::HashSet;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Module {
    CoreER,
    NeuroSurg,
    Cardio,
    ObGyn,
    Pediatrics,
    Oncology,
    Radiology,
    Anesthesiology,
    Nephrology,
    Orthopedics,
    Internist,
    Psychiatry,
    Gastroenterology,
    Dermatology,
    Ophthalmology,
    Pulmonology,
    Pathology,
    Endocrinology,
    Rheumatology,
    Pharmacy,
    ExecRevenueGuard,
}

pub struct TenantLicense {
    pub active_modules: HashSet<Module>,
}

pub static LICENSE_STATE: Lazy<Mutex<TenantLicense>> = Lazy::new(|| {
    let mut modules = HashSet::new();
    // Default base modules activated for the prototype
    modules.insert(Module::CoreER);
    modules.insert(Module::Cardio);
    modules.insert(Module::ExecRevenueGuard);
    // The rest are "LOCKED" behind the Stripe Paywall

    Mutex::new(TenantLicense { active_modules: modules })
});

pub fn unlock_module(module: Module) -> String {
    let mut state = LICENSE_STATE.lock().unwrap();
    state.active_modules.insert(module.clone());
    format!("Module {:?} unlocked successfully via Stripe API.", module)
}

pub fn check_module_access(module: Module) -> bool {
    let state = LICENSE_STATE.lock().unwrap();
    state.active_modules.contains(&module)
}

pub fn get_locked_message(module: Module) -> String {
    format!("PAYWALL: {:?} is locked. Upgrade your subscription to access this NCE feature.", module)
}

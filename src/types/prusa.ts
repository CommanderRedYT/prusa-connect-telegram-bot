export interface PrinterListResponse {
    printers: Printer[];
    pager: Pager;
}

export interface Printer {
    printer_model: string;
    supported_printer_models: string[];
    printer_type_compatible: string[];
    printer_state: string;
    last_online: number;
    nozzle_diameter: number;
    enclosure: Enclosure;
    tools: Tools;
    slot?: Slot;
    slots?: number;
    mmu: Mmu2;
    connect_state: string;
    filament?: Filament;
    allowed_functionalities: string[];
    uuid: string;
    name: string;
    location: string;
    created: number;
    printer_type: string;
    printer_type_name: string;
    team_id: number;
    team_name: string;
    firmware: string;
    disabled: Disabled;
    rights_r: boolean;
    rights_w: boolean;
    rights_u: boolean;
    job_info?: JobInfo;
    temp?: Temp;
    axis_z?: number;
    speed?: number;
    job_queue_count?: number;
}

export interface Enclosure {
    present: boolean;
}

export interface Tools {
    '1': N1;
    '1.1'?: N11;
    '1.2'?: N12;
    '1.3'?: N13;
    '1.4'?: N14;
    '1.5'?: N15;
}

export interface N1 {
    active: boolean;
    mmu?: Mmu;
    hardened?: boolean;
    high_flow?: boolean;
    nozzle_diameter: number;
    temp?: number;
    material?: string;
}

export interface Mmu {
    enabled: boolean;
}

export interface N11 {
    material: string;
}

export interface N12 {
    material: string;
}

export interface N13 {
    material: string;
}

export interface N14 {
    material: string;
}

export interface N15 {
    material: string;
}

export interface Slot {
    slots: Slots;
}

export interface Slots {
    '1': N16;
    '2'?: N2;
    '3'?: N3;
    '4'?: N4;
    '5'?: N5;
}

export interface N16 {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface N2 {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface N3 {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface N4 {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface N5 {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface Mmu2 {
    enabled: boolean;
    version?: string;
}

export interface Filament {
    material: string;
    bed_temperature: number;
    nozzle_temperature: number;
}

export interface Disabled {
    monitoring: boolean;
    auto_printing: boolean;
    auto_harvesting: boolean;
}

export interface JobInfo {
    origin_id: number;
    id: number;
    path: string;
    hash: string;
    start: number;
    end: number;
    progress: number;
    preview_url: string;
    state: string;
    model_weight: number;
    weight_remaining: number;
    print_height: number;
    total_height: number;
    display_name: string;
    time_printing: number;
    time_remaining: number;
}

export interface Temp {
    temp_nozzle: number;
    temp_bed: number;
    target_nozzle: number;
    target_bed: number;
}

export interface Pager {
    limit: number;
    offset: number;
    total: number;
    sort_by: SortBy[];
}

export interface SortBy {
    column: string;
    order: string;
    default: string;
}

export interface PrinterListResponse {
    printers: Printer[];
    pager: Pager;
}

export enum PrinterState {
    STOPPED = 'STOPPED',
}

export interface Printer {
    printer_model: string;
    supported_printer_models: string[];
    printer_type_compatible: string[];
    printer_state: PrinterState;
    last_online: number;
    nozzle_diameter: number;
    enclosure: Enclosure;
    tools: Tools;
    slot?: Slot;
    slots?: number;
    mmu: MmuStatus;
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
    temp?: Temperature;
    axis_z?: number;
    speed?: number;
    job_queue_count?: number;
}

export interface Enclosure {
    present: boolean;
}

// TODO: Refactor this
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
    slots: {
        [key: string]: Nozzle;
    };
}

export interface Nozzle {
    hardened: boolean;
    material: string;
    high_flow: boolean;
    nozzle_diameter: number;
}

export interface MmuStatusEnabled {
    enabled: true;
    version: string;
}

export interface MmuStatusDisabled {
    enabled: false;
}

export type MmuStatus = MmuStatusEnabled | MmuStatusDisabled;

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

export enum JobState {
    FIN_STOPPED = 'FIN_STOPPED',
}

export const jobInfoStateToString = (state: JobState): string => {
    switch (state) {
        case JobState.FIN_STOPPED:
            return 'STOPPED';
        default:
            return `Unknown (${state})`;
    }
};

export interface JobInfo {
    origin_id: number;
    id: number;
    path: string;
    hash: string;
    start: number;
    end: number;
    progress: number;
    preview_url: string;
    state: JobState;
    model_weight: number;
    weight_remaining: number;
    print_height: number;
    total_height: number;
    display_name: string;
    time_printing: number;
    time_remaining: number;
}

export interface Temperature {
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

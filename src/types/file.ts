export interface UploadResponse {
    message: string;
    path: string;
    extra?: any;
}

export interface ApiResponse {
    success: boolean;
    message: string;
    data?: any;
    timestamp: Date;
}
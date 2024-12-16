export const inSeconds = (seconds: number): Date => {
    const now = new Date();

    return new Date(now.getTime() + seconds * 1000);
};

export const inMinutes = (minutes: number): Date => inSeconds(minutes * 60);

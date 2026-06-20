export async function waitFor(fun: Function, millis = 6000) {
    // wait with timeout until provider creates the meetId
    const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, millis);
    });
    let intervalCheck = null;
    const devicePromise = new Promise<void>((resolve) => {
        intervalCheck = setInterval(() => {
            if (fun()) {
                resolve();
            }
        }, 500);
    });

    await Promise.any([timeoutPromise, devicePromise]);
    if (intervalCheck != null) {
        clearInterval(intervalCheck);
    }
    return fun();
}
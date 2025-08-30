// Safely get a nested property from an object using a dot-separated path string.
export const getNestedProperty = (obj: any, path: string): any => {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Immutably set a nested property on an object using a dot-separated path string.
// Creates nested objects if they don't exist.
export const setNestedProperty = (obj: any, path: string, value: any): any => {
    const keys = path.split('.');
    const newObj = JSON.parse(JSON.stringify(obj || {})); // Deep copy to ensure immutability
    
    keys.reduce((acc, key, index) => {
        if (index === keys.length - 1) {
            acc[key] = value;
        } else {
            if (acc[key] === undefined || typeof acc[key] !== 'object' || acc[key] === null) {
                acc[key] = {};
            }
        }
        return acc[key];
    }, newObj);
    
    return newObj;
};

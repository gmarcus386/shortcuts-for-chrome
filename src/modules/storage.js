/**
 * Application storage for persisting data
 * @module
 * @name Storage
 */
export default class Storage {

    /**
     * @description List of storage keys. Only these keys can be stored in this storage.
     * @returns Object
     */
    static get keys() {
        return {pinned: 'pinned'};
    };

    /**
     * @description Migrate storage from local to sync storage
     * This allows syncing user preferences between devices
     */
    static migrateStorage() {
        window.chrome.storage.local.get([Storage.keys.pinned], items => {
            const result = items[Storage.keys.pinned] || [];

            // do not overwrite sync storage if already done
            if (result.length) {
                Storage.save(Storage.keys.pinned, result, _ => false);
                // clear local storage
                window.chrome.storage.local.set({[Storage.keys.pinned]: []}, _ => false);
            }
        });
    }

    /**
     * @function
     * @description get some property from storage
     * @param {String|Array<String>} keys must be one of `storage.keys` or `null`.
     * If `null`, entire contents of the storage will be returned.
     * @param {function} callback - function to call with result
     */
    static get(keys, callback) {
        window.chrome.storage.sync.get(keys, callback);
    };

    /**
     * @function
     * @description save some property in storage
     * @param {String} key - one of `storage.keys`
     * @param {*} value - value to save
     * @param {function} callback - called after save operation has completed
     */
    static save(key, value, callback) {
        window.chrome.storage.sync.set({[key]: value}, callback);
    };
}

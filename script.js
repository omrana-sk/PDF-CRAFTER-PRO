/**
 * script.js
 * Handles UI interactions for the Document Viewer WebView.
 * EXPECTS to communicate with native mobile code (Java/Kotlin/Swift/ObjC)
 * via a JavaScript Bridge (assumed to be window.NativeBridge).
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const settingsBtn = document.getElementById('settingsBtn');
    const closeBtn = document.getElementById('closeBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const mainContentArea = document.querySelector('main');
    const storageListContainer = document.getElementById('storage-list-container');

    // Store the initial HTML of the main section to restore later
    let initialMainContentHTML = mainContentArea.innerHTML;

    // --- Native Bridge ---
    // This object MUST be injected by your native code.
    const NativeBridge = window.NativeBridge || null;
    if (!NativeBridge) {
        console.warn("!!!! Native Bridge (window.NativeBridge) is NOT available. App functionality will be limited and rely on dummy data. Implement the native bridge and its functions. !!!!");
    }

    // --- Sidebar Logic ---
    function openSidebar() { /* ... same as before ... */
        sidebar.classList.add('active');
        overlay.classList.add('active');
    }
    function closeSidebar() { /* ... same as before ... */
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    if (settingsBtn) settingsBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);


    // --- Functions to RECEIVE Data from Native ---
    // These functions are CALLED BY the native code.

    /**
     * Updates file counts in the UI. Called by native code.
     * @param {object} counts - Example: { all: 928, pdf: 60, ... }
     */
    window.updateFileCounts = function(counts) { /* ... same as before ... */
        console.log("JS: Native called updateFileCounts:", counts);
        if (!counts) return;
        document.getElementById('count-all').textContent = `${counts.all || 0} files`;
        document.getElementById('count-pdf').textContent = `${counts.pdf || 0} files`;
        document.getElementById('count-doc').textContent = `${counts.doc || 0} files`;
        document.getElementById('count-xls').textContent = `${counts.xls || 0} files`;
        document.getElementById('count-ppt').textContent = `${counts.ppt || 0} files`;
        document.getElementById('count-txt').textContent = `${counts.txt || 0} files`;
        document.getElementById('count-archive').textContent = `${counts.archive || 0} files`;
    };

    /**
     * Updates storage info in the UI. Called by native code.
     * @param {Array<object>} storageData - Example: [ { name: 'Internal', free: 3.9, total: 64, unit: 'GB', path: '...' } ]
     */
    window.updateStorageInfo = function(storageData) { /* ... same as before ... */
        console.log("JS: Native called updateStorageInfo:", storageData);
        if (!storageListContainer) return;
        storageListContainer.innerHTML = ''; // Clear old data

        if (!storageData || storageData.length === 0) {
            storageListContainer.innerHTML = '<p class="error-message">Could not load storage information.</p>';
            return;
        }
        // (Loop through storageData and create HTML - same logic as before)
        storageData.forEach(storage => {
            const freeSpace = storage.free || 0;
            const totalSpace = storage.total || 1;
            const unit = storage.unit || 'GB';
            const path = storage.path || '';
            const percentageUsed = totalSpace > 0 ? ((totalSpace - freeSpace) / totalSpace) * 100 : 0;
            const circumference = 2 * Math.PI * 18;
            const offset = circumference - (percentageUsed / 100) * circumference;
            const isSD = storage.name.toLowerCase().includes('sd') || (path && !path.includes('emulated'));

            const itemHTML = `
                <div class="storage-item" data-path="${path}" data-name="${storage.name}">
                    <div class="storage-icon-wrapper"> <i class="fas ${isSD ? 'fa-sd-card' : 'fa-hdd'} storage-icon"></i> <svg class="progress-ring" width="40" height="40"><circle class="progress-ring__circle-bg" stroke="#555" stroke-width="3" fill="transparent" r="18" cx="20" cy="20"/><circle class="progress-ring__circle" stroke="#4CAF50" stroke-width="3" fill="transparent" r="18" cx="20" cy="20" style="stroke-dasharray: ${circumference} ${circumference}; stroke-dashoffset: ${offset};"/></svg></div>
                    <div class="storage-details"> <p class="storage-name">${storage.name}</p> <p class="storage-space">${freeSpace.toFixed(2)} ${unit} Free</p> </div>
                    <i class="fas fa-chevron-right arrow-icon"></i>
                </div>`;
            storageListContainer.innerHTML += itemHTML;
        });
        addClickListenersToElements('#storage-list-container .storage-item', handleStorageItemClick);
    };

    /**
     * Displays the list of files. Called by native code.
     * @param {Array<object>} files - Example: [{ name: 'Doc1.pdf', path: '...', size: 1024, type: 'pdf' }]
     * @param {string} category
     */
    window.displayFileList = function(files, category) { /* ... same as before ... */
        console.log(`JS: Native called displayFileList for ${category} with ${files ? files.length : 0} files.`);
        let fileListHTML = `
            <div class="file-list-view">
                <button id="backToMainBtn" class="back-button"> < Back</button>
                <h2>${category ? category.toUpperCase() : 'Files'}</h2>
                <ul class="file-list-ul">`;

        if (files && files.length > 0) {
            files.forEach(file => {
                const iconClass = getIconForFileType(file.type || file.name);
                fileListHTML += `
                    <li class="file-item" data-path="${file.path || ''}" data-name="${file.name || 'Unknown'}" data-type="${file.type || ''}">
                        <i class="${iconClass} file-icon"></i>
                        <span class="file-name">${file.name || 'Unknown'}</span>
                        ${file.size !== undefined ? `<span class="file-size">${formatFileSize(file.size)}</span>` : ''}
                    </li>`;
            });
        } else {
            fileListHTML += '<p class="no-files-message">No files found.</p>';
        }
        fileListHTML += '</ul></div>';
        mainContentArea.innerHTML = fileListHTML;
        addClickListenersToElements('.file-item', handleFileItemClick);
        const backButton = document.getElementById('backToMainBtn');
        if (backButton) backButton.addEventListener('click', restoreMainContentView);
    };


    // --- Functions to SEND Requests TO Native ---
    // These functions CALL the native code via the bridge.

    function requestFileListFromNative(categoryType) {
        console.log(`JS: Requesting file list for category: ${categoryType}`);
        if (NativeBridge && NativeBridge.requestFiles) {
            NativeBridge.requestFiles(categoryType);
        } else {
            // BRIDGE NOT AVAILABLE - Log warning and use dummy data for testing UI flow
            console.warn(`JS: Native Bridge or 'requestFiles' function not found. Cannot get real files for ${categoryType}. Displaying dummy data.`);
            // Display dummy files after a short delay to simulate async loading
            showLoadingIndicator(); // Show loading message
            setTimeout(() => {
                window.displayFileList(getDummyFiles(categoryType), categoryType);
            }, 800); // Simulate network/scan delay
        }
    }

    function requestOpenFileFromNative(filePath, fileName, fileType) {
        console.log(`JS: Requesting to open file: ${fileName} at path: ${filePath}`);
        if (!filePath) {
            console.error("JS: File path is missing."); return;
        }

        const type = (fileType || fileName.split('.').pop() || '').toLowerCase();

        if (type === 'pdf' && NativeBridge && NativeBridge.openPdf) {
            NativeBridge.openPdf(filePath);
        } else if (NativeBridge && NativeBridge.openFile) {
            NativeBridge.openFile(filePath);
        } else {
            // BRIDGE NOT AVAILABLE - Log warning, maybe show a message
            console.warn(`JS: Native Bridge function (openPdf or openFile) not found. Cannot open: ${filePath}`);
            // You might show a non-blocking message instead of an alert
            showTemporaryMessage(`Native function needed to open this ${type} file.`);
        }
    }

    function requestInitialDataFromNative() {
        console.log("JS: Requesting initial data from native side...");
        if (NativeBridge && NativeBridge.getInitialData) {
            NativeBridge.getInitialData();
        } else {
            // BRIDGE NOT AVAILABLE - Use dummy data for initial load
            console.warn("JS: Native Bridge or 'getInitialData' function not found. Using dummy data.");
            setTimeout(useDummyData, 300); // Simulate initial load delay
        }
    }

     function requestBrowsePathFromNative(storagePath, storageName) {
        console.log(`JS: Requesting to browse storage: ${storageName} at path: ${storagePath}`);
        if (NativeBridge && NativeBridge.browsePath) {
             NativeBridge.browsePath(storagePath);
        } else {
             console.warn(`JS: Native Bridge (browsePath) not found. Cannot browse path: ${storagePath}`);
             showTemporaryMessage("Native function needed to browse storage.");
        }
    }

    // --- Event Handlers ---
    function handleStaticCardClick(event) { /* ... same logic as before to determine category/action ... */
        const card = event.currentTarget;
        let category = null; let action = null;
        // Determine category/action based on card classes... (same logic as before)
        if (card.classList.contains('cat-all')) category = 'all';
        else if (card.classList.contains('cat-pdf')) category = 'pdf';
        else if (card.classList.contains('cat-doc')) category = 'doc';
        else if (card.classList.contains('cat-xls')) category = 'xls';
        else if (card.classList.contains('cat-ppt')) category = 'ppt';
        else if (card.classList.contains('cat-txt')) category = 'txt';
        else if (card.classList.contains('cat-archive')) category = 'archive';
        else if (card.classList.contains('place-recent')) category = 'recent';
        else if (card.classList.contains('place-favourites')) category = 'favourites';
        else if (card.classList.contains('place-folder')) action = 'browseFolders';
        else if (card.classList.contains('place-creation')) category = 'creation';

        if (category) { requestFileListFromNative(category); return; }

        if (action === 'browseFolders') { /* ... handle folder browsing ... */
            if (NativeBridge && NativeBridge.browseFolders) { NativeBridge.browseFolders(); }
            else { console.warn("JS: Native Bridge (browseFolders) not found."); showTemporaryMessage("Native function needed to browse folders."); }
            return;
        }
        // Handle Tools/PDF Ops (Check NativeBridge for each specific function)
        const titleElement = card.querySelector('.card-title');
        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Action';
        console.log(`JS: Clicked on Tool/Operation: ${title}`);
        if (title === 'Images to PDF' && NativeBridge && NativeBridge.startImageToPdf) { NativeBridge.startImageToPdf(); }
        // ... add checks for other tool/pdf op bridge functions ...
        else {
            console.warn(`JS: No specific native action defined for "${title}" or bridge function missing.`);
             showTemporaryMessage(`Native function needed for "${title}".`);
        }
    }
    function handleFileItemClick(event) { /* ... same as before ... */
        const fileItem = event.currentTarget;
        requestOpenFileFromNative(fileItem.dataset.path, fileItem.dataset.name, fileItem.dataset.type);
    }
    function handleStorageItemClick(event) { /* ... same as before ... */
        const storageItem = event.currentTarget;
        const storagePath = storageItem.dataset.path;
        if (storagePath) { requestBrowsePathFromNative(storagePath, storageItem.dataset.name); }
        else { console.warn("JS: Storage path not available for browsing."); }
    }

    // --- Utility Functions ---
    function getIconForFileType(fileNameOrType) { /* ... same as before ... */
        if (!fileNameOrType) return 'fas fa-file';
        const extension = (fileNameOrType.includes('.') ? fileNameOrType.split('.').pop() : fileNameOrType).toLowerCase();
        switch (extension) {
            case 'pdf': return 'fas fa-file-pdf'; case 'doc': case 'docx': return 'fas fa-file-word';
            case 'xls': case 'xlsx': return 'fas fa-file-excel'; case 'ppt': case 'pptx': return 'fas fa-file-powerpoint';
            case 'txt': return 'fas fa-file-alt'; case 'zip': case 'rar': case '7z': return 'fas fa-file-archive';
            case 'jpg': case 'jpeg': case 'png': case 'gif': return 'fas fa-file-image';
            case 'mp3': case 'wav': case 'ogg': return 'fas fa-file-audio'; case 'mp4': case 'avi': case 'mkv': return 'fas fa-file-video';
            default: return 'fas fa-file';
        }
    }
    function formatFileSize(bytes) { /* ... same as before ... */
        if (bytes === undefined || bytes === null || isNaN(bytes)) return ''; if (bytes === 0) return '0 Bytes';
        const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    function addClickListenersToElements(selector, handler, eventType = 'click', parentElement = mainContentArea) { /* ... same as before ... */
         if (!parentElement) return;
        parentElement.querySelectorAll(selector).forEach(element => {
            if (!element.dataset.listenerAdded) { element.addEventListener(eventType, handler); element.dataset.listenerAdded = 'true'; }
        });
    }

    // --- View Management & UI Feedback ---
    function restoreMainContentView() { /* ... same as before ... */
        mainContentArea.innerHTML = initialMainContentHTML;
        attachInitialStaticListeners();
        const restoredStorageContainer = document.getElementById('storage-list-container');
        if (restoredStorageContainer) addClickListenersToElements('.storage-item', handleStorageItemClick, 'click', restoredStorageContainer);
        else console.error("Could not find storage list container after restoring main view.");
    }

    function showLoadingIndicator() {
        // Simple implementation: replace content with a loading message
        mainContentArea.innerHTML = '<div class="loading-indicator">Loading files...</div>';
    }

    function showTemporaryMessage(message) {
        // Example: Create a temporary toast-like message
        let msgDiv = document.createElement('div');
        msgDiv.className = 'temporary-message';
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        setTimeout(() => {
            msgDiv.remove();
        }, 2500); // Remove after 2.5 seconds
         // Add basic styling for this message in your style.css if needed:
         // .temporary-message { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: rgba(0,0,0,0.7); color: white; padding: 10px 15px; border-radius: 5px; z-index: 2000; }
    }


    // --- Initialization ---
    function attachInitialStaticListeners() { /* ... same as before ... */
        addClickListenersToElements('.card', handleStaticCardClick, 'click', mainContentArea);
    }
    attachInitialStaticListeners();
    requestInitialDataFromNative(); // Request initial data

    // --- Dummy Data Section (for browser/fallback testing) ---
    function getDummyCounts() { return { all: 15, pdf: 3, doc: 2, xls: 0, ppt: 0, txt: 5, archive: 1 }; }
    function getDummyStorage() { return [ { name: 'Internal (Simulated)', free: 10.5, total: 64, unit: 'GB', path: 'dummy:///internal' }, { name: 'SD Card (Simulated)', free: 25.2, total: 128, unit: 'GB', path: 'dummy:///sdcard' } ]; }
    window.dummyFiles = { /* ... same dummy file structure as before ... */
        pdf: [ { name: 'Report.pdf', path: 'dummy:///Report.pdf', size: 1234567, type: 'pdf' }, /* ... */ ],
        doc: [ { name: 'Notes.docx', path: 'dummy:///Notes.docx', size: 56789, type: 'docx' }, /* ... */ ],
        txt: [ { name: 'Readme.txt', path: 'dummy:///Readme.txt', size: 1024, type: 'txt' }, /* ... */ ],
        all: [ /* ... mix of files ... */ ], recent: [ /* ... */ ], creation: [], favourites: [], archive:[]
    };
    window.getDummyFiles = function(category) { console.log(`JS: Providing dummy files for category: ${category}`); return window.dummyFiles[category] || []; };
    function useDummyData() { console.log("JS: Using dummy data for initial display."); window.updateFileCounts(getDummyCounts()); window.updateStorageInfo(getDummyStorage()); }
    // --- End Dummy Data ---

}); // End DOMContentLoaded
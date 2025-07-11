document.getElementById('saveSettings').addEventListener('click', function() {
    const originalMessage = document.getElementById('originalMessage').checked;
    const dayFirst = document.getElementById('dayFirst').checked;
    const showTime = document.getElementById('showTime').checked;
    const defaultLocale = document.getElementById('defaultLocale').checked;

    const options = {
        originalMessage: originalMessage,
        dayFirst: dayFirst,
        showTime: showTime,
        defaultLocale: defaultLocale
    };

    // Save data
    browser.storage.sync.set({ userOptions: options }).then(() => {
        console.log('Saved settings:', options);
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('confirmationModal').style.display = 'block';
    }).catch((error) => {
        console.error('Fehler beim Speichern:', error);
    });
});

document.getElementById('closeModal').addEventListener('click', function() {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('confirmationModal').style.display = 'none';
});

// Load data
browser.storage.sync.get('userOptions').then((data) => {
    console.log('Loaded settings:', data);
    if (data.userOptions) {
        document.getElementById('originalMessage').checked = data.userOptions.originalMessage;
        document.getElementById('dayFirst').checked = data.userOptions.dayFirst;
        document.getElementById('showTime').checked = data.userOptions.showTime;
        document.getElementById('defaultLocale').checked = data.userOptions.defaultLocale;
    }
}).catch((error) => {
    console.error('Error occurred when loading the settings:', error);
});
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsBox = document.getElementById('settings-box');

const checkboxAA = document.getElementById('setting-aa');
const selectHudSize = document.getElementById('setting-hud-size');
const inputHudColor = document.getElementById('setting-hud-color');

settingsBtn.addEventListener('click', () => {
    settingsBox.style.display = 'block'; // Macht die Box sichtbar
});

closeSettingsBtn.addEventListener('click', () => {
    settingsBox.style.display = 'none'; // Versteckt die Box wieder
    saveSettings(); // Speichert die Auswahl, wenn man schließt
});

function saveSettings() {
     const gameSettings = {
        antiAliasing: checkboxAA.checked, // true oder false (ECHTES AA)
        hudSize: selectHudSize.value,     // 'small', 'medium' oder 'large'
        hudColor: inputHudColor.value     // Der Hex-Farbcode (z.B. #00ffff)
    };

    localStorage.setItem('infectra_settings', JSON.stringify(gameSettings));
    console.log("Settings erfolgreich gespeichert:", gameSettings);
}

// ctx.imageSmoothingEnabled = settings.antiAliasing; // Aktiviert oder deaktiviert echtes Anti-Aliasing basierend auf der Einstellung
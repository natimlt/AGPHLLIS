/**
 * ======================================================
 * AGPHL LIS - Login Page Animations
 * Typing/erasing tagline rotation for the branding panel.
 * Purely cosmetic - no dependency on app data or auth.
 * ======================================================
 */

(function () {
    const taglines = [
        'Accurate results. Every time.',
        'ISO 15189:2022 aligned quality management.',
        'From sample to report, fully tracked.',
        'Turnaround time you can trust.'
    ];

    const el = document.getElementById('brandTagline');
    if (!el) return;

    let taglineIndex = 0;
    let charIndex = 0;
    let deleting = false;

    function tick() {
        const current = taglines[taglineIndex];

        if (!deleting) {
            charIndex++;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === current.length) {
                deleting = true;
                setTimeout(tick, 1800);
                return;
            }
            setTimeout(tick, 55);
        } else {
            charIndex--;
            el.textContent = current.slice(0, charIndex);
            if (charIndex === 0) {
                deleting = false;
                taglineIndex = (taglineIndex + 1) % taglines.length;
                setTimeout(tick, 400);
                return;
            }
            setTimeout(tick, 30);
        }
    }

    // Respect users who've asked for reduced motion
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
        el.textContent = taglines[0];
    } else {
        tick();
    }
})();

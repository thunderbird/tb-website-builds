/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

(function () {
    'use strict';
    window.site = {
        getPlatform: function (ua, pf) {
            // Firefox OS navigator.platform is an empty string, which equates to a falsey value in JS
            // Ths means we must use an ugly ternary statement here to make testing easier.
            pf = (pf === '') ? '' : pf || navigator.platform;
            ua = ua || navigator.userAgent;

            // have to check ChromeOS first because it looks like Windows otherwise
            if (/CrOS/.test(ua)) {
                return 'chromeos';
            }
            if (/Win(16|9[x58]|NT( [1234]| 5\.0| [^0-9]|[^ -]|$))/.test(ua) ||
                    /Windows ([MC]E|9[x58]|3\.1|4\.10|NT( [1234]\D| 5\.0| [^0-9]|[^ ]|$))/.test(ua) ||
                    /Windows_95/.test(ua)) {
                /**
                 * Officially unsupported platforms are Windows 95, 98, ME, NT 4.x, 2000
                 * These regular expressions match:
                 *  - Win16
                 *  - Win9x
                 *  - Win95
                 *  - Win98
                 *  - WinNT (not followed by version or followed by version <= 5)
                 *  - Windows ME
                 *  - Windows CE
                 *  - Windows 9x
                 *  - Windows 95
                 *  - Windows 98
                 *  - Windows 3.1
                 *  - Windows 4.10
                 *  - Windows NT (not followed by version or followed by version <= 5)
                 *  - Windows_95
                 */
                return 'oldwin';
            }
            if (pf.indexOf('Win32') !== -1 ||
                    pf.indexOf('Win64') !== -1) {
                return 'windows';
            }
            if (/android/i.test(ua)) {
                return 'android';
            }
            if (/linux/i.test(pf) || /linux/i.test(ua)) {
                return 'linux';
            }
            if (pf.indexOf('MacPPC') !== -1) {
                return 'oldmac';
            }
            if (/Mac OS X 10.[0-8]\D/.test(ua)) {
                return 'oldmac';
            }
            if (pf.indexOf('iPhone') !== -1 ||
                    pf.indexOf('iPad') !== -1 ||
                    pf.indexOf('iPod') !== -1 ) {
                return 'ios';
            }
            if (ua.indexOf('Mac OS') !== -1) {
                return 'osx';
            }
            if (ua.indexOf('MSIE 5.2') !== -1) {
                return 'oldmac';
            }
            if (pf.indexOf('Mac') !== -1) {
                return 'oldmac';
            }
            if (pf === '' && /Firefox/.test(ua)) {
                return 'fxos';
            }

            return 'other';
        },

        getPlatformVersion: function (ua) {
            ua = ua || navigator.userAgent;

            // On OS X, Safari and Chrome have underscores instead of dots
            var match = ua.match(/Windows\ NT\ (\d+\.\d+)/) ||
                        ua.match(/Mac\ OS\ [ X ]?(\d+[\._]?\d+)/) ||
                        ua.match(/Android\ (\d+\.\d+)/);

            return match ? match[1].replace('_', '.') : undefined;
        },

        getArchType: function (ua, pf) {
            pf = (pf === '') ? '' : pf || navigator.platform;
            ua = ua || navigator.userAgent;

            var re;

            // Windows RT and Windows Phone using ARMv7
            if (/Windows/.test(ua) && /ARM/.test(ua)) {
                return 'armv7';
            }

            // IE-specific property
            if (navigator.cpuClass) {
                return navigator.cpuClass.toLowerCase();
            }

            // ARM
            re = /armv\d+/i;
            if (re.test(pf) || re.test(ua)) {
                return RegExp.lastMatch.toLowerCase();
            }

            // ARMv8 64-bit
            if (/aarch64/.test(pf)) {
                return 'armv8';
            }

            // PowerPC
            re = /PowerPC|PPC/i;
            if (re.test(pf) || re.test(ua)) {
                return 'ppc';
            }

            // We can't detect the type info. It's probably x86 but unsure.
            // For example, iOS may be running on ARM-based Apple A7 processor
            return 'x86';
        },

        getArchSize: function (ua, pf) {
            pf = (pf === '') ? '' : pf || navigator.platform;
            ua = ua || navigator.userAgent;

            var re = /x64|x86_64|Win64|WOW64|aarch64/i;
            if (re.test(pf) || re.test(ua)) {
                return 64;
            }

            // We can't detect the bit info. It's probably 32 but unsure.
            // For example, OS X may be running on 64-bit Core i7 processor
            return 32;
        },

        needsSha1: function(ua) {
            ua = ua || navigator.userAgent;
            // Check for Windows XP, Server 2003, Vista.
            // Matches sha-1 regex in Bouncer
            // https://github.com/mozilla-services/go-bouncer/
            var os = /Windows (?:NT 5.1|XP|NT 5.2|NT 6.0)/;
            // Firefox uses its own trust store, so can continue to use sha-256.
            var ff = /\sFirefox/;

            return os.test(ua) && !ff.test(ua);
        },

        platform: 'other',
        platformVersion: undefined,
        archType: 'x64',
        archSize: 32
    };
    (function () {
        var h = document.documentElement;

        // if other than 'windows', immediately replace the platform classname on the html-element
        // to avoid lots of flickering
        var platform = window.site.platform = window.site.getPlatform();
        var version = window.site.platformVersion = window.site.getPlatformVersion();

        if (platform === 'windows') {
            // Add class to support downloading Firefox for Windows 64-bit on Windows 10 and later
            if (version && parseFloat(version) >= 10.0) {
                platform = 'win10up';
            // Windows 7 - 8.1
            } else if (version && parseFloat(version) >= 6.1) {
                platform = 'win7-8';
            }
        }

        h.className = h.className.replace('other', platform);


        // Add class to reflect the microprocessor architecture info
        var archType = window.site.archType = window.site.getArchType();
        var archSize = window.site.archSize = window.site.getArchSize();
        var isARM = archType.match(/armv(\d+)/);

        if (archType !== 'x86') {
            h.className = h.className.replace('x86', archType);

            if (isARM) {
                h.className += ' arm';

                // Add class to support downloading Firefox for Android on ARMv7 and later
                if (parseFloat(isARM[1]) >= 7) {
                    h.className += ' armv7up';
                }
            }
        }
        if (archSize === 64) {
            h.className += ' x64';
        }

        // Add class to reflect javascript availability for CSS
        h.className = h.className.replace(/\bno-js\b/, 'js');
    })();
})();

// Create namespace
if (typeof Mozilla === 'undefined') {
    var Mozilla = {};
}

(function() {
    'use strict';

    var Donation = {};
    Donation.NEWSLETTER_URL = `https://www.thunderbird.net/${window.siteLocale}/newsletter`;
    /**
     * Is the download form visible?
     * @type {boolean}
     */
    Donation.IsVisible = false;
    /**
     * Stateful download link to be retrieved by the FRU on.checkoutOpen event
     * @type {?string}
     */
    Donation.CurrentDownloadLink = null;
    /**
     * Stateful check to determine if the supporter needs to be redirected after the FRU on.checkoutClose event
     * @type {boolean}
     */
    Donation.NeedsNewsletterRedirect = false;

    /**
     * Stateful copy of the location.href value on page load. Used to fix tracking url after donation checkout close
     * @type {string}
     */
    Donation.OriginalHref = '';

    /**
     * List of available goal ids aligned with their actions
     * You don't want to use this directly, ActiveGoals gets set by window._site_id.
     * @type {object}
     */
    Donation.Goals = {
        'tbn': {
            'clicked': 1,
            'finished': 7
        },
        'utn': {
            'clicked': 1,
            'finished': 3,
        }
    }

    /**
     * The active goals to use, defaults to thunderbird.net
     * @type {{finished: number, clicked: number}}
     */
    Donation.ActiveGoals = Donation.Goals['tbn'];

    /**
     * Setups our FRU javascript events
     */
    Donation.Init = function() {
        if (!window.FundraiseUp) {
            return;
        }

        if (window._site_id) {
            Donation.ActiveGoals = Donation.Goals[window._site_id]
        }

        const searchParams = new URLSearchParams(window.location.search);

        // If a user clicks on a donate button, track the donate link click goal
        const donateButtons = document.querySelectorAll('[data-donate-btn]');
        donateButtons.forEach(function(element) {
            // Correct the utmSource
            for (const [key, value] of searchParams.entries()) {
                if (!key.startsWith('utm_')) {
                    continue;
                }

                const href = new URL(element.href);

                // Adjust the utm source to newsletter
                href.searchParams.set(key, value);

                // Set the new href
                element.href = href.toString();
            }

            element.addEventListener('click', function() {
                window._paq = window._paq || [];
                window._paq.push(['trackGoal', Donation.ActiveGoals.clicked]);
            });
        });

        // Ensure we actually have the javascript loaded, so we can hook up our events.
        const fundraiseUp = window.FundraiseUp;

        // Note: This won't play well this any location history adjustments!
        Donation.OriginalHref = location.href;

        /**
         * Event fires when the FRU checkout modal opens
         * @param details - See https://fundraiseup.com/docs/parameters/
         */
        fundraiseUp.on('checkoutOpen', function(details) {
            window._paq = window._paq || [];
            window._paq.push(['setCustomUrl', location.href]);
            window._paq.push(['trackEvent', 'Donation', 'Started']);

            // Reset any stateful variables
            Donation.NeedsNewsletterRedirect = false;

            // Retrieve the current download link before we close the form (as that clears it)
            const download_link = Donation.CurrentDownloadLink;

            // No download link? Exit.
            if (!download_link) {
                return;
            }

            // Send off the download event
            window._paq.push(['trackLink', download_link, 'download']);

            // Timeout is here to prevent url collisions with fundraiseup form.
            window.setTimeout(function() {
                window.open(download_link, '_self');
            }, 1000);
        });
        /**
         * Event fires when the FRU checkout is closed.
         * @param details - See https://fundraiseup.com/docs/parameters/
         */
        fundraiseUp.on('checkoutClose', function (details) {
            if (!Donation.NeedsNewsletterRedirect) {
                // Set the tracking url the original page load url
                window._paq.push(['setCustomUrl', Donation.OriginalHref]);
                return;
            }

            // Redirect them to the newsletter landing page
            location.href = Donation.NEWSLETTER_URL;
        });
        /**
         * Event fires when the FRU conversion is completed successfully.
         * @param details - See https://fundraiseup.com/docs/parameters/
         */
        fundraiseUp.on('donationComplete', function(details) {
            if (!details) {
                return;
            }

            window._paq = window._paq || [];

            // TrackEvent: Category, Action, Name
            window._paq.push(['trackEvent', 'Donation', 'Completed']);
            window._paq.push(['trackGoal', Donation.ActiveGoals.finished]); // Donation Completed Goal

            if (details.supporter) {
                const hasSubscribedToNewsletter = details.supporter.mailingListSubscribed || false;

                if (hasSubscribedToNewsletter) {
                    const state = window.open(Donation.NEWSLETTER_URL, '_blank');

                    // If a browser doesn't want us to open a new tab (due to a pop-up blocker, or chrome's 'user must click once on a page before we allow redirect') then just redirect them.
                    Donation.NeedsNewsletterRedirect = state === null;
                }
            }
        });
    }

    /**
     * Display FRUs donation form - This is just for donations, not the download form.
     * @param utmContent {?string}
     * @param utmSource {?string}
     * @param utmMedium {?string}
     * @param utmCampaign {?string}
     * @param redirect {?string} - Whether we should redirect the user to another page
     * @deprecated Donation url code has been migrated to static build process. This is left here in case of further AB tests.
     */
    Donation.MakeDonateUrl = function(utmContent = null, utmSource = 'thunderbird.net', utmMedium = 'fru', utmCampaign = 'donation_2023', redirect = null) {
        /*
        const is_donate_redirect = redirect === 'donate';
        const is_download_redirect = redirect && redirect.indexOf('download-') !== -1;

        // en-US gets converted to en, so fix that if needed.
        const lang = document.documentElement.lang === 'en' ? 'en-US': document.documentElement.lang;

        let params = {
            // Don't open the form automatically if we're redirecting to donate
            'form': is_donate_redirect ? null : 'support',
            'utm_content': utmContent,
            'utm_source': utmSource,
            'utm_medium': utmMedium,
            'utm_campaign': utmCampaign,
            // Split off our download-(esr|beta|daily) query param
            'download_channel': is_download_redirect ? redirect.split('-')[1] : null,
        };

        // Filter nulls from the object (this mutates)
        Object.keys(params).forEach((k) => params[k] == null && delete params[k]);

        params = new URLSearchParams(params);

        const query_params = `?${params.toString()}`;

        if (is_donate_redirect) {
            // We don't have a good way to get the current environment in javascript right now..
            return `https://www.thunderbird.net/${lang}/donate/${query_params}#donate`;
        } else if (is_download_redirect) {
            return `/${lang}/download/${query_params}`;
        }

        return query_params;
        */
    }

    window.Mozilla.Donation = Donation;
    window.addEventListener('load', () => Donation.Init());
})();

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


// Create namespace
if (typeof Mozilla === 'undefined') {
    var Mozilla = {};
}

(function() {
    'use strict';

    /**
     * Super simple ABTest module, it puts you in one of the buckets.
     * Bucket === 0 - A
     * Bucket === 1 - B
     */
    const ABTest = {};
    ABTest.bucket = null;

    ABTest.RandomInt = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Pick a random int between 0 - 1.
     * Once a bucket has been chosen, this function does nothing.
     */
    ABTest.Choose = function() {
        /*
        if (ABTest.bucket !== null) {
            return;
        }

        ABTest.bucket = ABTest.RandomInt(0, 1);
        */
    }

    /**
     * Tracks our bucket choice.
     * Called from matomo.js, registers a bucket if no bucket has been chosen.
     */
    ABTest.Track = function() {
        /*
        if (ABTest.bucket === null) {
            ABTest.Choose();
        }

        // Initialize the command queue if it's somehow not.
        const _paq = window._paq = window._paq || [];

        // TrackEvent: Category, Action, Name
        _paq.push(['trackEvent', 'AB-Test - Test Name Here', 'Bucket Registration', ABTest.bucket === 0 ? 'a' : 'b']);
        */
    }

    /**
     * Are we in the FundraiseUp bucket?
     * @returns {boolean}
     */
    ABTest.IsInBucketA = function() {
        return ABTest.bucket === 0;
    }

    /**
     * Are we in the legacy give.thunderbird.net bucket?
     * @returns {boolean}
     */
    ABTest.IsInBucketB = function() {
        return ABTest.bucket === 1;
    }

    /**
     * Replaces a 'HTMLAnchorElement' href tag with the bucket's (only FRU right now) equivalent url.
     * @param element : HTMLAnchorElement
     */
    ABTest.ReplaceDonateLinks = function(element) {
        /*
        if (ABTest.IsInBucketA()) {
            // If we somehow don't have an element, we can exit and still start any redirects.
            if (!element) {
                return;
            }

            // Falsey fallback check to transform '' => null
            const utmContent = element.getAttribute('data-donate-content') || null;
            const utmSource = element.getAttribute('data-donate-source') || 'thunderbird.net';
            const utmMedium = element.getAttribute('data-donate-medium') || 'fru';
            const utmCampaign = element.getAttribute('data-donate-campaign') || 'donation_flow_2023';
            const redirect = element.getAttribute('data-donate-redirect') || null;

            element.href = window.Mozilla.Donation.MakeDonateUrl(utmContent, utmSource, utmMedium, utmCampaign, redirect);
        }
        */
    }

    /**
     * Any required initializations for our ABTest should go here
     * Called after ABTest is added to the Mozilla namespace.
     */
    ABTest.Init = function() {
        // Pick one!
        ABTest.Choose();
    }

    window.Mozilla.ABTest = ABTest;

    ABTest.Init();
})();
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Donation Blocker Detector
 */
// The widget id on the donate page, should be the same as the 'href' value (minus the hash.)
const FRU_FORM_WIDGET = 'XVFNMBAK';
const FRU_TIMEOUT_IN_MS = 7_500;

let donationCountdownHandle = null;
let donationCheckoutSuccess = false;

/**
 * Display the dialog element #donation-blocked-notice only if the element exists, and a FRU element hasn't been detected.
 */
const showDonationNotice = () => {
  const notice = document.getElementById('donation-blocked-notice');
  const donatePageEmbeddedWidget = document.getElementById(FRU_FORM_WIDGET);
  const isFRULoaded = donationCheckoutSuccess || donatePageEmbeddedWidget;

  // Clear our state variables now
  donationCountdownHandle = null;
  donationCheckoutSuccess = false;

  // Exit early if the notice doesn't exist, or FRU is loaded.
  if (!notice || isFRULoaded) {
    return;
  }

  notice.showModal();
};

/**
 * Simply checks if there isn't a countdown in progress before starting a new one.
 */
const startDonationNoticeCountdown = () => {
  if (donationCountdownHandle !== null) {
    return;
  }
  donationCountdownHandle = window.setTimeout(() => showDonationNotice(), FRU_TIMEOUT_IN_MS);
};

document.addEventListener('DOMContentLoaded', () => {
  // Don't set anything up if notice doesn't exist
  const notice = document.getElementById('donation-blocked-notice');
  if (!notice) {
    return;
  }

  // Hook up notice's close button
  const noticeCloseButton = document.querySelector('#donation-blocked-notice .close-btn');
  if (noticeCloseButton) {
    noticeCloseButton.addEventListener('click', () => {
      notice.close()
    });
  }

  // Conditions for the countdown
  const donationButtons = document.querySelectorAll('[data-donate-btn]');
  for (const donationButton of donationButtons) {
    // Any donation button that redirects should be skipped as that's not where the modal will show up.
    // Ref: [data-dont-show-donation-blocked-notice]
    if ('dontShowDonationBlockedNotice' in donationButton.dataset) {
      continue;
    }
    donationButton.addEventListener('click', () => {
      startDonationNoticeCountdown();
    });
  }

  // If they've clicked on a donation button (adds ?form=<form_id> to searchparams) or if they're on the donations page.
  if (window.location.search.includes('form=') || document.getElementsByClassName('page-donations').length > 0) {
    startDonationNoticeCountdown();
  }

  // Finally setup a event handler for FRU checkoutOpen
  // This will only trigger once the checkout is fully loaded,
  // which can cause some issues with slower internet speeds.
  window.FundraiseUp.on('checkoutOpen', function() {
    // If we opened after the countdown fires then close the notice.
    if (notice.open) {
      notice.close();
    }

    donationCheckoutSuccess = true;
  });
});
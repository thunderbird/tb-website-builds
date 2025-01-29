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

/* exported _dntEnabled */

/**
 * Returns true or false based on whether doNotTack is enabled. It also takes into account the
 * anomalies, such as !bugzilla 887703, which effect versions of Fx 31 and lower. It also handles
 * IE versions on Windows 7, 8 and 8.1, where the DNT implementation does not honor the spec.
 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1217896 for more details
 * @params {string} [dnt] - An optional mock doNotTrack string to ease unit testing.
 * @params {string} [ua] - An optional mock userAgent string to ease unit testing.
 * @returns {boolean} true if enabled else false
 */
function _dntEnabled(dnt, ua) {

    'use strict';

    // for old version of IE we need to use the msDoNotTrack property of navigator
    // on newer versions, and newer platforms, this is doNotTrack but, on the window object
    // Safari also exposes the property on the window object.
    var dntStatus = dnt || navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    var userAgent = ua || navigator.userAgent;

    // List of Windows versions known to not implement DNT according to the standard.
    var anomalousWinVersions = ['Windows NT 6.1', 'Windows NT 6.2', 'Windows NT 6.3'];

    var fxMatch = userAgent.match(/Firefox\/(\d+)/);
    var ieRegEx = /MSIE|Trident/i;
    var isIE = ieRegEx.test(userAgent);
    // Matches from Windows up to the first occurance of ; un-greedily
    // http://www.regexr.com/3c2el
    var platform = userAgent.match(/Windows.+?(?=;)/g);

    // With old versions of IE, DNT did not exist so we simply return false;
    if (isIE && typeof Array.prototype.indexOf !== 'function') {
        return false;
    } else if (fxMatch && parseInt(fxMatch[1], 10) < 32) {
        // Can't say for sure if it is 1 or 0, due to Fx bug 887703
        dntStatus = 'Unspecified';
    } else if (isIE && platform && anomalousWinVersions.indexOf(platform.toString()) !== -1) {
        // default is on, which does not honor the specification
        dntStatus = 'Unspecified';
    } else {
        // sets dntStatus to Disabled or Enabled based on the value returned by the browser.
        // If dntStatus is undefined, it will be set to Unspecified
        dntStatus = { '0': 'Disabled', '1': 'Enabled' }[dntStatus] || 'Unspecified';
    }

    return dntStatus === 'Enabled' ? true : false;
}

/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #1 - September 4, 2014
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * Mozilla.Cookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * Mozilla.Cookies.getItem(name)
|*|  * Mozilla.Cookies.removeItem(name[, path[, domain]])
|*|  * Mozilla.Cookies.hasItem(name)
|*|  * Mozilla.Cookies.keys()
|*|
\*/

// create namespace
if (typeof Mozilla === 'undefined') {
    var Mozilla = {};
}

Mozilla.Cookies = {
    getItem: function (sKey) {
        if (!sKey) { return null; }
        return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
    },
    setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
        if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
        var sExpires = '';
        if (vEnd) {
            switch (vEnd.constructor) {
            case Number:
                sExpires = vEnd === Infinity ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : '; max-age=' + vEnd;
                break;
            case String:
                sExpires = '; expires=' + vEnd;
                break;
            case Date:
                sExpires = '; expires=' + vEnd.toUTCString();
                break;
            }
        }
        document.cookie = encodeURIComponent(sKey) + '=' + encodeURIComponent(sValue) + sExpires + (sDomain ? '; domain=' + sDomain : '') + (sPath ? '; path=' + sPath : '') + (bSecure ? '; secure' : '');
        return true;
    },
    removeItem: function (sKey, sPath, sDomain) {
        if (!this.hasItem(sKey)) { return false; }
        document.cookie = encodeURIComponent(sKey) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' + (sDomain ? '; domain=' + sDomain : '') + (sPath ? '; path=' + sPath : '');
        return true;
    },
    hasItem: function (sKey) {
        if (!sKey) { return false; }
        return (new RegExp('(?:^|;\\s*)' + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, '\\$&') + '\\s*\\=')).test(document.cookie);
    },
    keys: function () {
        var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, '').split(/\s*(?:\=[^;]*)?;\s*/);
        for (var nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
        return aKeys;
    },
    enabled: function() {
        /**
         * Cookies feature detect lifted from Modernizr
         * https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cookies.js
         *
         * navigator.cookieEnabled cannot detect custom or nuanced cookie blocking
         * configurations. For example, when blocking cookies via the Advanced
         * Privacy Settings in IE9, it always returns true. And there have been
         * issues in the past with site-specific exceptions.
         * Don't rely on it.

         * try..catch because in some situations `document.cookie` is exposed but throws a
         * SecurityError if you try to access it; e.g. documents created from data URIs
         * or in sandboxed iframes (depending on flags/context)
         */
        try {
            // Create cookie
            document.cookie = 'cookietest=1';
            var ret = document.cookie.indexOf('cookietest=') !== -1;
            // Delete cookie
            document.cookie = 'cookietest=1; expires=Thu, 01-Jan-1970 00:00:01 GMT';
            return ret;
        }
        catch (e) {
            return false;
        }
    }
};

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

if (typeof Mozilla == 'undefined') {
    var Mozilla = {};
}

(function() {
    // init dataLayer object
    var dataLayer = window.dataLayer = window.dataLayer || [];
    var Analytics = {};

    /** Returns page ID used in Event Category for GA events tracked on page.
    * @param {String} path - URL path name fallback if page ID does not exist.
    * @return {String} GTM page ID.
    */
    Analytics.getPageId = function(path) {
        var pageId = document.getElementsByTagName('html')[0].getAttribute('data-gtm-page-id');
        var pathName = path ? path : document.location.pathname;

        return pageId ? pageId : pathName.replace(/^(\/\w{2}\-\w{2}\/|\/\w{2,3}\/)/, '/');
    };

    // Push page ID into dataLayer so it's ready when GTM container loads.
    dataLayer.push({
        'event': 'page-id-loaded',
        'pageId': Analytics.getPageId()
    });

    Mozilla.Analytics = Analytics;
})();


/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


/**
 * This script contains various other scripts that should be organized in the future...
 */

/**
 * Handle nav expandables / hamburgers
 */
document.addEventListener('DOMContentLoaded', function() {
  const hamburgerBtn = document.getElementById('mobile-hamburger-button');
  const navExpandables = document.getElementsByClassName("nav-expandable");

  if (!hamburgerBtn || !navExpandables) {
    return;
  }

  /**
   * HamburgerBtn On Click
   * Toggle the navigation when the hamburger button is clicked. This also affects the aria attributes.
   */
  hamburgerBtn.addEventListener('click', function(evt) {
    evt.preventDefault();

    const navMenu = document.getElementById('nav-menu');
    const isExpanded = hamburgerBtn.ariaExpanded === 'true';

    if (!isExpanded) {
      navMenu.classList.add('expanded');
    } else {
      navMenu.classList.remove('expanded');
    }

    // Flip the aria attr.
    hamburgerBtn.ariaExpanded = isExpanded ? 'false' : 'true';

  });

  /**
   * For each nav-expandable's button child: adjust the ariaExpanded attribute depending on hover/focus state
   */
  for (const item of navExpandables) {
    item.addEventListener('focusin', function(evt) {
      evt.target.ariaExpanded = "true";
    });
    item.addEventListener('mouseenter', function(evt) {
      evt.target.ariaExpanded = "true";
    });
    item.addEventListener('focusout', function(evt) {
      evt.target.ariaExpanded = "false";
    });
    item.addEventListener('mouseleave', function(evt) {
      evt.target.ariaExpanded = "false";
    });
  }

});

/**
 * Handle autoplaying videos, including detecting if the user is requesting reduced motion (in which case we don't autoplay.)
 */
document.addEventListener('DOMContentLoaded', function() {
  const autoplayVideos = document.querySelectorAll('video[autoplay]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  for (const item of autoplayVideos) {
    // Disable autoplay and pause playback if they would like reduced motion
    if (reduceMotion) {
      item.autoplay = false;
      item.pause();
    }

    const togglePlayback = (evt) => {
      const target = evt.target;
      const isPaused = target.paused;
      if (isPaused) {
        target.play();
      } else {
        target.pause();
      }
    }

    // Allow toggling playback with a click
    item.addEventListener('click', togglePlayback);
    item.addEventListener('keyup', (evt) => {
      if (evt.key === 'Enter') {
        togglePlayback(evt);
      }
    })
  }
});

/**
 * Handle download redirects
 */
document.addEventListener('DOMContentLoaded', function() {
  const downloadButtons = document.querySelectorAll('[data-donate-link]');

  for (const downloadButton of downloadButtons) {
    downloadButton.addEventListener('click', (evt) => {
      const element = evt.currentTarget;
      const donate_url = element.getAttribute('data-donate-link') || null;

      if (!donate_url) {
        return;
      }

      // TODO: Unsure if this check is still needed.
      // MSIE and Edge cancel the download prompt on redirect, so just leave them out.
      if (!(/msie\s|trident\/|edge\//i.test(navigator.userAgent))) {
          setTimeout(function() {
              window.location.href = donate_url;
          }, 5000);
      }

    });
  }
});

/**
 * For participates accordions. If we detect a valid id in the fragment, we grab the next sibling element
 * which is the accordion/summary tag and open it. Only happens on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  const fragment = window.location.hash.substring(1);
  const element = document.getElementById(fragment);
  if (!element) {
    return;
  }
  const accordionElement = element.nextElementSibling;
  if (!accordionElement) {
    return;
  }
  accordionElement.setAttribute('open', 'open');
});
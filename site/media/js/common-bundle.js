// Create namespace
if (typeof Mozilla === 'undefined') {
    var Mozilla = {};
}

(function() {
    'use strict';

    var Donation = {};
    Donation.ANIMATION_DURATION = 250;
    Donation.WINDOW_POS_KEY = '_tb_donation_position';
    Donation.NEWSLETTER_URL = `/${window.siteLocale}/newsletter`;
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
     * Setups our FRU javascript events
     */
    Donation.Init = function() {
        if (!window.FundraiseUp) {
            return;
        }

        // Ensure we actually have the javascript loaded, so we can hook up our events.
        const fundraiseUp = window.FundraiseUp;

        /**
         * Event fires when the FRU checkout modal opens
         * @param details - See https://fundraiseup.com/docs/parameters/
         */
        fundraiseUp.on('checkoutOpen', function(details) {
            // Reset any stateful variables
            Donation.NeedsNewsletterRedirect = false;

            // Retrieve the current download link before we close the form (as that clears it)
            const download_link = Donation.CurrentDownloadLink;

            Donation.CloseForm();

            // No download link? Exit.
            if (!download_link) {
                return;
            }

            // Make sure _paq exists, and then send off the download event
            window._paq = window._paq || [];
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
            if (!details || !details.supporter) {
                return;
            }

            const hasSubscribedToNewsletter = details.supporter.mailingListSubscribed || false;

            if (hasSubscribedToNewsletter) {
                const state = window.open(Donation.NEWSLETTER_URL, '_blank');

                // If a browser doesn't want us to open a new tab (due to a pop-up blocker, or chrome's 'user must click once on a page before we allow redirect') then just redirect them.
                Donation.NeedsNewsletterRedirect = state === null;
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
     */
    Donation.MakeDonateUrl = function(utmContent = null, utmSource = 'thunderbird.net', utmMedium = 'fru', utmCampaign = 'donation_flow_2023', redirect = null) {
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
    }

    /**
     * Close the donation form
     * This will clear any currently set download link.
     */
    Donation.CloseForm = function() {
        $('#amount-modal').fadeOut(Donation.ANIMATION_DURATION);
        $('#modal-overlay').fadeOut(Donation.ANIMATION_DURATION);
        $(document.body).removeClass('overflow-hidden');
        Donation.IsVisible = false;
        Donation.CurrentDownloadLink = null;
    }

    /**
     * Display the donation download modal for fundraise up
     * @param download_url - Link to the actual file download
     */
    Donation.DisplayDownloadForm = function(download_url) {
        // Show the donation form.
        $('#amount-modal').fadeIn(Donation.ANIMATION_DURATION);
        $('#modal-overlay').fadeIn(Donation.ANIMATION_DURATION);
        $(document.body).addClass('overflow-hidden');
        Donation.IsVisible = true;
        Donation.CurrentDownloadLink = download_url;

        // Set the "No thanks, just download" button's link
        if ($("#amount-cancel")[0]) {
            $("#amount-cancel")[0].href = download_url;
        }

        // Define cancel and close button on the donation form.
        $('#amount-cancel').click(function(e) {
            // No prevent default
            Donation.CloseForm();
        });
        $('#close-modal').click(function(e) {
            e.preventDefault();
            Donation.CloseForm();
        });

        // Close modal when clicking the overlay
        $('#modal-overlay').click(function(e) {
            e.preventDefault();
            Donation.CloseForm();
        });

        // Close modal when pressing escaoe
        $(document).keyup(function(e) {
            if (e.key === "Escape") {
                Donation.CloseForm();
            }
        });

        // Define active amount in amount selection.
        $('#amount-selection > label').click(function() {
            $('#amount-selection > label.active').removeClass('active');
            $(this).addClass('active');
        });
        $('#amount-other-selection').click(function() {
            $('#amount-other').focus();
        });
        $('#amount-other').click(function() {
            $('#amount-other-selection').prop('checked', true);
        });
        $('#amount-other').on('input', function() {
            $('#amount-other-selection').val($(this).val());
        });
    };

    window.Mozilla.Donation = Donation;
    Donation.Init();
})();

// Create namespace
if (typeof Mozilla === 'undefined') {
    var Mozilla = {};
}

(function() {
    'use strict';

    /**
     * Super simple ABTest module, it puts you in one of the buckets.
     * Bucket === 0 - FundraiseUp
     * Bucket === 1 - give.thunderbird.net
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
        if (ABTest.bucket !== null) {
            return;
        }

        ABTest.bucket = ABTest.RandomInt(0, 1);
    }

    /**
     * Tracks our bucket choice.
     * Called from matomo.js, registers a bucket if no bucket has been chosen.
     */
    ABTest.Track = function() {
        if (ABTest.bucket === null) {
            ABTest.Choose();
        }

        // Initialize the command queue if it's somehow not.
        const _paq = window._paq = window._paq || [];

        // TrackEvent: Category, Action, Name
        _paq.push(['trackEvent', 'AB-Test - Donation Flow 2023', 'Bucket Registration', ABTest.bucket === 0 ? 'fru' : 'give']);
    }

    /**
     * Are we in the FundraiseUp bucket?
     * @returns {boolean}
     */
    ABTest.IsInFundraiseUpBucket = function() {
        return ABTest.bucket === 0;
    }

    /**
     * Are we in the legacy give.thunderbird.net bucket?
     * @returns {boolean}
     */
    ABTest.IsInGiveBucket = function() {
        return ABTest.bucket === 1;
    }

    /**
     * FundraiseUp's download functionality. This will simply raise the Donation form.
     * @param download_url
     * @private
     * @deprecated Might be removed in a later release
     */
    ABTest._FundraiseUpDownload = function(download_url) {
        window.Mozilla.Donation.DisplayDownloadForm(download_url);
    }

    /**
     * Legacy give.thunderbird.net download functionality.
     * This will redirect them to the donation url, which will start the download.
     * @param download_url
     * @param donate_url
     * @private
     */
    ABTest._GiveDownload = function(download_url, donate_url) {
        // Don't redirect if we're on the failed download page.
        if ($("body").attr('id') !== 'thunderbird-download') {
            // MSIE and Edge cancel the download prompt on redirect, so just leave them out.
            if (!(/msie\s|trident\/|edge\//i.test(navigator.userAgent))) {
                setTimeout(function() {
                    window.location.href = donate_url;
                }, 5000);
            }
        }
        window.Mozilla.Utils.triggerIEDownload(download_url);
    }

    /**
     * Start the Download, it will handle determining what bucket we're in and what download path we need to go down.
     * @param event : Event
     */
    ABTest.Download = function(event) {
        const element = event.target;
        const download_url = element.href;
        const donate_url = element.dataset.donateLink || null;

        if (ABTest.IsInGiveBucket()) {
            ABTest._GiveDownload(download_url, donate_url);
        }
    }

    /**
     * Replaces a 'HTMLAnchorElement' href tag with the bucket's (only FRU right now) equivalent url.
     * @param element : HTMLAnchorElement
     */
    ABTest.ReplaceDonateLinks = function(element) {
        if (ABTest.IsInFundraiseUpBucket()) {
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
    }

    /**
     * Any required initializations for our ABTest should go here
     * Called after ABTest is added to the Mozilla namespace.
     */
    ABTest.Init = function() {
        // Pick one!
        ABTest.Choose();

        // Replace the donation button's links with the correct one.
        const donate_buttons = document.querySelectorAll('[data-donate-btn]');
        for (const donate_button of donate_buttons) {
            ABTest.ReplaceDonateLinks(donate_button);
        }

        // Replace the download button's links with our download redirect
        const download_buttons = document.querySelectorAll('.download-link');
        for (const download_button of download_buttons) {
            ABTest.ReplaceDonateLinks(download_button);
        }
    }

    window.Mozilla.ABTest = ABTest;

    ABTest.Init();
})();
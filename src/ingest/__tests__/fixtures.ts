/**
 * Saved HTML snapshots. When a site changes its markup, the fixture stops
 * matching, exactly one test fails, and the failure message names the
 * source.
 *
 * These are hand-written stand-ins with the structure the adapters look
 * for, not copies of anyone's pages. Real snapshots are captured by
 * `npm run ingest:snapshot` into fixtures/<source>/ and are gitignored
 * where the source's terms require it.
 */

export const JIJI_FIXTURE = `<!DOCTYPE html>
<html>
<head><meta name="description" content="Neat chamber and hall self contain at Ahodwo. GWCL water four days a week, polytank, gated compound. 12 months advance."></head>
<body>
  <h1>Chamber and hall self contain &ndash; Ahodwo</h1>
  <div class="qa-advert-price">GH&cent; 700 / month</div>
  <div class="b-show-advert__description">
    Neat chamber and hall self contain at Ahodwo, about 300m from the roundabout.
    GWCL water four days a week, polytank on site, gated compound.
    12 months advance. Commission GHC 420.
  </div>
  <span itemprop="addressLocality">Ahodwo</span>
  <div class="b-seller-block__name">Agent A</div>
  <div class="b-seller-block__phone">024 412 3456</div>
  <div class="qa-advert-gallery-image"></div>
  <div class="qa-advert-gallery-image"></div>
  <div class="qa-advert-gallery-image"></div>
</body>
</html>`;

export const JIJI_NO_ADVANCE_FIXTURE = `<!DOCTYPE html>
<html>
<head><meta name="description" content="Single room self contain at Tamale. Call for details."></head>
<body>
  <h1>Single room self contain &ndash; Tamale</h1>
  <div class="qa-advert-price">GH&cent; 500 / month</div>
  <div class="b-show-advert__description">
    Single room self contain at Tamale, near the junction. Call for details.
  </div>
  <span itemprop="addressLocality">Tamale</span>
  <div class="b-seller-block__name">Agent Q</div>
</body>
</html>`;

export const GATED_FIXTURE = `<!DOCTYPE html>
<html><body>
  <h1>Please log in to continue</h1>
  <div class="g-recaptcha" data-sitekey="x"></div>
</body></html>`;

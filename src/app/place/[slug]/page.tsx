import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DETAIL, METER_LABEL, TRUST, WATER_LABEL, unitTypeLabel } from '@/core/copy';
import { formatMoney, totalToMoveIn } from '@/core/money';
import { freshness } from '@/core/freshness';
import { gapsFor, headlineListing, rentSpread } from '@/core/derive';
import { planFor } from '@/core/plan';
import { clusterBySlug, sourceName } from '@/core/repo';
import { sourceConfig } from '@/ingest/config';
import { SaveControls } from '@/components/SaveControls';
import { Section } from '@/components/Section';
import ui from '@/components/ui.module.css';
import styles from './detail.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (c === null) return { title: 'Not found' };
  const where = c.landmark === null ? c.town.name : `${c.landmark.name}, ${c.town.name}`;
  const total = c.totalToMoveInMin;
  return {
    title: `${unitTypeLabel(c.unitType)} near ${where}`,
    description:
      total === null
        ? `${formatMoney(c.rentMin)} a month near ${where}. The advance is not stated, so there is no total to move in.`
        : `${formatMoney(total)} to move in near ${where}. Listed by ${c.listings.length} ${c.listings.length === 1 ? 'agent' : 'agents'}.`,
  };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = clusterBySlug(slug);
  if (c === null) notFound();

  const head = headlineListing(c);
  const total = c.totalToMoveInMin;
  const spread = rentSpread(c);
  const gaps = gapsFor(c);
  const fresh = freshness(c.seenDaysAgo, c.sourceCount > 1);
  const plan = planFor(c.unitType);

  const place =
    c.landmark === null
      ? DETAIL.locationNotStated(c.town.name)
      : `${c.approxDistanceM === null ? 'Near' : `~${c.approxDistanceM}m from`} ${c.landmark.name}, ${c.town.name}`;

  // Contact is only offered where the route that brought us the listing
  // permits holding a number. Act 843 has no public-data exemption, so a
  // crawled listing links out instead.
  const contactable = c.listings.filter((l) => {
    const cfg = sourceConfig(l.sourceId);
    return l.agentPhone !== null && cfg !== null && cfg.mayStoreContact;
  });
  const cheapestContactable = [...contactable].sort(
    (a, b) => (a.monthlyRent ?? 0) - (b.monthlyRent ?? 0),
  )[0];

  return (
    <div className={`${styles.wrap} ${ui.pageBottom}`}>
      <Link className={ui.btnTertiary} href="/search">
        ← {DETAIL.back}
      </Link>

      <div className={styles.grid}>
        <article className={styles.main}>
          <div className={styles.hero}>
            <div className={styles.plan} aria-hidden="true">
              {plan.map((p, i) => (
                <div key={i} className={styles.planBlock} style={{ flex: p.f, height: p.h }}>
                  <span>{p.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.heroCaptions}>
              <span className={ui.caption}>{DETAIL.planCaveat}</span>
              <span className={`${ui.caption} num`}>
                {c.photoCount === 0
                  ? DETAIL.photosNone
                  : `${c.photoCount} photos on the source listing`}
              </span>
            </div>
          </div>

          <header className={styles.headline}>
            <p className={ui.overline}>{DETAIL.overline}</p>
            <p className={`${styles.figure} num`} data-testid="detail-figure">
              {total === null ? formatMoney(c.rentMin) : formatMoney(total)}
            </p>
            <p className={`${ui.caption} num`}>
              {total === null || head === null || head.advanceMonths === null
                ? DETAIL.qualifierNoAdvance
                : DETAIL.qualifier(formatMoney(head.monthlyRent), head.advanceMonths)}
            </p>
            <p className={ui.h3}>{unitTypeLabel(c.unitType)}</p>
            <p className={c.landmark === null ? `${ui.caption} ${ui.notStated}` : ui.caption}>
              {place}
            </p>
            <p>
              <span
                className={styles.freshBadge}
                style={{ background: fresh.bg, color: fresh.ink }}
              >
                {fresh.label}
              </span>
            </p>
          </header>

          {/* ---- What you'd pay ---- */}
          <Section
            title={DETAIL.secPay}
            sub={
              total === null
                ? DETAIL.secPaySubNoAdvance
                : head === null || head.agentFee === null
                  ? DETAIL.secPaySubNoFee(formatMoney(c.totalToMoveInMin))
                  : DETAIL.secPaySub(
                      formatMoney(totalToMoveIn(head.monthlyRent, head.advanceMonths, null)),
                      formatMoney(head.agentFee),
                    )
            }
            defaultOpen
          >
            <Rows
              rows={[
                [DETAIL.rowMonthlyRent, formatMoney(c.rentMin), c.rentMin === null],
                [
                  DETAIL.rowAdvance,
                  head === null || head.advanceMonths === null
                    ? 'Not stated'
                    : DETAIL.rowAdvanceValue(
                        head.advanceMonths,
                        formatMoney(totalToMoveIn(head.monthlyRent, head.advanceMonths, null)),
                      ),
                  head === null || head.advanceMonths === null,
                ],
                [
                  DETAIL.rowAgentFee,
                  head === null ? 'Not stated' : formatMoney(head.agentFee),
                  head === null || head.agentFee === null,
                ],
                [DETAIL.rowViewingFee, 'Not stated', true],
                [DETAIL.rowCaution, 'Not stated', true],
                total === null
                  ? [DETAIL.rowCashToMoveIn, DETAIL.cannotBeCalculated, true]
                  : [DETAIL.rowWithFee, formatMoney(total), false],
              ]}
            />
          </Section>

          {/* ---- Who's listing it ---- */}
          <Section
            title={DETAIL.secWho}
            sub={
              c.listings.length === 1
                ? DETAIL.secWhoSubOne
                : DETAIL.secWhoSub(c.listings.length, formatMoney(spread))
            }
            emphasis={c.listings.length > 1}
          >
            {spread !== null ? (
              <p className={`${styles.warn} num`}>{DETAIL.spreadWarning(formatMoney(spread))}</p>
            ) : null}
            <ul className={styles.agents}>
              {c.listings.map((l) => {
                const cfg = sourceConfig(l.sourceId);
                return (
                  <li key={l.id} className={styles.agent}>
                    <div className={styles.agentLeft}>
                      <span className={styles.agentName}>
                        {l.agentName === null ? 'Agent not named' : l.agentName}
                      </span>
                      <span className={ui.caption}>
                        {sourceName(l.sourceId)} · first seen{' '}
                        {l.firstSeenAt.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span
                        className={ui.caption}
                        style={
                          l.reacLicensed === true ? { color: 'var(--palm-700)' } : undefined
                        }
                      >
                        {l.reacLicensed === true ? TRUST.licenceFound : TRUST.licenceUnchecked}
                      </span>
                      {l.sourceUrl.startsWith('http') ? (
                        <a
                          className={ui.caption}
                          href={l.sourceUrl}
                          rel="nofollow noopener external"
                          target="_blank"
                        >
                          {DETAIL.sourceLink} ↗
                        </a>
                      ) : null}
                    </div>
                    <div className={styles.agentRight}>
                      <span className={`${styles.agentPrice} num`}>
                        {DETAIL.perMonth(formatMoney(l.monthlyRent))}
                      </span>
                      <span
                        className={
                          l.advanceMonths === null ? `${ui.caption} ${ui.notStated}` : ui.caption
                        }
                      >
                        {l.advanceMonths === null
                          ? DETAIL.advanceNotStatedShort
                          : DETAIL.advanceMonths(l.advanceMonths)}
                      </span>
                      {cfg !== null && !cfg.mayStoreContact ? (
                        <span className={`${ui.caption} ${ui.notStated}`}>
                          Contact at the source
                        </span>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          {/* ---- What's actually there ---- */}
          <Section title={DETAIL.secThere} sub={DETAIL.secThereSub}>
            <Rows
              rows={[
                [
                  DETAIL.rowWaterSource,
                  c.attributes.water === null ? 'Not stated' : WATER_LABEL[c.attributes.water],
                  c.attributes.water === null,
                ],
                [
                  DETAIL.rowWaterDays,
                  c.attributes.waterDays === null
                    ? 'Not stated'
                    : DETAIL.waterDaysValue(c.attributes.waterDays),
                  c.attributes.waterDays === null,
                ],
                [
                  DETAIL.rowPolytank,
                  c.attributes.polytank === true ? DETAIL.yes : 'Not stated',
                  c.attributes.polytank !== true,
                ],
                [
                  DETAIL.rowMeter,
                  c.attributes.meter === null ? 'Not stated' : METER_LABEL[c.attributes.meter],
                  c.attributes.meter === null,
                ],
                [DETAIL.rowToilet, c.attributes.toilet ?? 'Not stated', c.attributes.toilet === null],
                [
                  DETAIL.rowBathroom,
                  c.attributes.bathroom ?? 'Not stated',
                  c.attributes.bathroom === null,
                ],
                [
                  DETAIL.rowKitchen,
                  c.attributes.kitchen ?? 'Not stated',
                  c.attributes.kitchen === null,
                ],
                [
                  DETAIL.rowCompound,
                  c.attributes.gated === true ? DETAIL.gatedValue : 'Not stated',
                  c.attributes.gated !== true,
                ],
              ]}
            />
          </Section>

          {/* ---- Getting there ---- */}
          <Section title={DETAIL.secGetting} sub={DETAIL.secGettingSub}>
            <div className={styles.staticMap}>
              <span className={`${ui.caption} num`}>{DETAIL.mapStatic}</span>
            </div>
            <p className={c.directions === null ? `${ui.body} ${ui.notStated}` : ui.body}>
              {c.directions ?? 'No directions given. Ask the agent for a landmark before travelling.'}
            </p>
            <p className={ui.caption}>{DETAIL.directionsCaveat}</p>
          </Section>

          {/* ---- What's not stated ---- */}
          <Section title={DETAIL.secGaps} sub={DETAIL.secGapsSub(gaps.length)}>
            <p className={ui.caption}>{DETAIL.gapsIntro}</p>
            <div className={ui.row}>
              {gaps.map((g) => (
                <span key={g} className={ui.thinPill}>
                  {g}
                </span>
              ))}
            </div>
            {cheapestContactable === undefined ? (
              <p className={ui.caption}>{DETAIL.contactUnavailableNote}</p>
            ) : (
              <>
                <a
                  className={ui.btnSecondary}
                  href={whatsappHref(cheapestContactable.agentPhone, gaps)}
                  rel="noopener"
                >
                  {DETAIL.askAgent}
                </a>
                <p className={ui.caption}>{DETAIL.askAgentFoot}</p>
              </>
            )}
          </Section>

          {/* ---- Trust surface. Pass 1:429 ---- */}
          <Section title={TRUST.neverHeading} sub="What HomeGuy will never do">
            <p className={ui.body}>{TRUST.never1}</p>
            <p className={ui.body}>{TRUST.never2}</p>
            <p className={ui.body}>{TRUST.never3}</p>
            <p className={ui.caption}>{TRUST.ghanaCard}</p>
            <Link className={ui.btnTertiary} href="/me#report">
              {DETAIL.reportListing}
            </Link>
          </Section>
        </article>

        <aside className={styles.rail}>
          <p className={ui.overline}>{DETAIL.overline}</p>
          <p className={`${styles.figure} num`}>
            {total === null ? formatMoney(c.rentMin) : formatMoney(total)}
          </p>
          <p className={`${ui.caption} num`}>
            {total === null || head === null || head.advanceMonths === null
              ? DETAIL.qualifierNoAdvance
              : DETAIL.qualifier(formatMoney(head.monthlyRent), head.advanceMonths)}
          </p>

          {cheapestContactable === undefined ? (
            <>
              <a
                className={ui.btnPrimary}
                href={c.listings[0]?.sourceUrl ?? '#'}
                rel="nofollow noopener external"
                target="_blank"
              >
                {DETAIL.contactUnavailable}
              </a>
              <p className={ui.caption}>{DETAIL.contactUnavailableNote}</p>
            </>
          ) : (
            <a
              className={ui.btnPrimary}
              href={whatsappHref(cheapestContactable.agentPhone, [])}
              rel="noopener"
            >
              {DETAIL.whatsappAgent(cheapestContactable.agentName ?? 'the agent')}
            </a>
          )}

          <SaveControls clusterId={c.id} />
          <p className={ui.caption}>{DETAIL.neverPayment}</p>
        </aside>
      </div>
    </div>
  );
}

function Rows({ rows }: { rows: Array<[string, string, boolean]> }) {
  return (
    <dl className={styles.rows}>
      {rows.map(([k, v, notStated]) => (
        <div className={styles.row} key={k}>
          <dt className={ui.caption}>{k}</dt>
          <dd className={notStated ? `${styles.value} ${ui.notStated}` : `${styles.value} num`}>
            {v}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function whatsappHref(phone: string | null, gaps: string[]): string {
  if (phone === null) return '#';
  const digits = phone.replace(/\D/g, '');
  const text =
    gaps.length === 0
      ? 'Hello, I saw this place on HomeGuy. Is it still available?'
      : `Hello, I saw this place on HomeGuy. Could you tell me: ${gaps.slice(0, 5).join(', ')}?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

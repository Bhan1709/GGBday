import { triggerCelebrationConfetti } from './confetti.js';
import { initGiftScene } from './gift_three.js';
import { initClaimScene } from './claim_three.js';

const LOCAL_STORAGE_KEY = 'birthday_giftcard_claims_v1';

export function initGiftCards(config) {
  const totalClaims = config.totalClaimsAllowed || 12;
  const expiryDate = config.claimExpiryDate || "August 13, 2027";
  const userEmail = config.notificationEmail || "your-email@example.com";
  const emailEndpoint = config.emailEndpoint || "";

  const stage = document.getElementById('giftcard-stage');
  const remainingCount = document.getElementById('gift-remaining-count');
  const progressDots = document.getElementById('gift-card-progress');
  const claimsList = document.getElementById('claims-list');
  const expiryEl = document.getElementById('gift-card-expiry');
  const redeemBtn = document.getElementById('redeem-gift-btn');
  const claimModal = document.getElementById('claim-modal');
  const claimForm = document.getElementById('claim-form');
  const claimModalClose = document.getElementById('claim-modal-close');
  const activeCouponTitle = document.getElementById('active-coupon-title');

  if (expiryEl) expiryEl.textContent = `Yours to Unwrap Until ${expiryDate}`;

  // Load existing claims from LocalStorage (keyed by request number 1..12)
  let claims = getSavedClaims();
  let activeCouponId = null;

  // ─── Init the Three.js 3D gift box scene ──────────────────────────────────
  let giftScene = null;
  if (stage) {
    giftScene = initGiftScene('gift-three-canvas', {
      total: totalClaims,
      claimedSet: new Set(Object.keys(claims).map(Number)),
      onBoxClick: (index) => {
        if (claims[index]) return;
        activeCouponId = index;
        openClaimModal();
      }
    });
  }

  // ─── Init the Three.js animated backdrop for the redeem form ──────────────
  const claimScene = initClaimScene('claim-three-canvas');

  function getSavedClaims() {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  function saveClaims(newClaims) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newClaims));
    } catch (e) {
      console.error("Failed to save claims in localStorage", e);
    }
  }

  function getClaimedCount() {
    return Object.keys(claims).length;
  }

  function getRemaining() {
    return Math.max(0, totalClaims - getClaimedCount());
  }

  function bumpStat(el) {
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // restart the animation
    el.classList.add('bump');
  }

  function updateRemainingCounter() {
    const remaining = getRemaining();

    if (remainingCount && remainingCount.textContent !== String(remaining)) {
      remainingCount.textContent = remaining;
      bumpStat(remainingCount);
    }

    if (redeemBtn) {
      const allClaimed = remaining === 0;
      redeemBtn.disabled = allClaimed;
      redeemBtn.textContent = allClaimed ? 'All Surprises Unwrapped 💖' : 'Unwrap a Surprise 💖';
    }
  }

  // ─── 12 Request Dots on the card ──────────────────────────────────────────
  const dotEls = new Map();

  function renderDots() {
    if (!progressDots) return;
    progressDots.innerHTML = '';

    for (let i = 1; i <= totalClaims; i++) {
      const dot = document.createElement('span');
      dot.className = 'gift-card-dot';
      dot.textContent = i;
      dot.style.animationDelay = `${0.1 + i * 0.06}s`;
      dot.title = `Surprise #${i}`;
      if (claims[i]) dot.classList.add('claimed');

      dot.addEventListener('click', () => {
        if (!claims[i]) {
          activeCouponId = i;
          openClaimModal();
        }
      });

      progressDots.appendChild(dot);
      dotEls.set(i, dot);
    }
  }

  function flashDot(index) {
    const dot = dotEls.get(index);
    if (!dot) return;
    const claim = claims[index];
    if (claim) dot.title = claim.amount ? `${claim.itemName} · ₹${claim.amount}` : claim.itemName;
    dot.classList.add('claimed', 'just-claimed');
    setTimeout(() => dot.classList.remove('just-claimed'), 1100);
  }

  // ─── Claims Log Rows (only revealed once she makes her first request) ─────
  const rowEls = new Map();
  let listRendered = false;

  function renderList() {
    if (!claimsList) return;
    claimsList.innerHTML = '';

    for (let i = 1; i <= totalClaims; i++) {
      const row = document.createElement('div');
      row.className = 'claim-row';
      row.dataset.index = String(i);
      row.style.animationDelay = `${0.15 + i * 0.06}s`;
      claimsList.appendChild(row);
      rowEls.set(i, row);
      fillRow(row, i);
    }
  }

  function fillRow(row, index) {
    const claim = claims[index];

    if (claim) {
      row.classList.add('claimed');
      const meta = [claim.amount ? `₹${escapeHtml(claim.amount)}` : '', escapeHtml(claim.date), claim.note ? `“${escapeHtml(claim.note)}”` : '']
        .filter(Boolean)
        .join(' · ');
      row.innerHTML = `
        <span class="claim-row-num">#${index}</span>
        <div class="claim-row-info">
          <div class="claim-row-title">${escapeHtml(claim.itemName)}</div>
          <div class="claim-row-meta">${meta}</div>
        </div>
        <span class="claim-row-status claimed">✓ Unwrapped</span>
      `;
    } else {
      row.innerHTML = `
        <span class="claim-row-num">#${index}</span>
        <div class="claim-row-info">
          <div class="claim-row-title available">Surprise #${index}</div>
          <div class="claim-row-meta">Waiting for your heart's desire</div>
        </div>
        <span class="claim-row-status available">🎁 Available</span>
      `;
    }
  }

  function refreshRow(index) {
    const row = rowEls.get(index);
    if (row) fillRow(row, index);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  // ─── Claim Modal ──────────────────────────────────────────────────────────
  function openClaimModal() {
    if (getRemaining() === 0) return;
    if (activeCouponTitle) {
      activeCouponTitle.textContent = `Unwrap Surprise #${activeCouponId}`;
    }
    if (claimModal) claimModal.classList.add('active');
    if (claimScene) claimScene.setActive(true);
  }

  function closeClaimModal() {
    if (claimModal) claimModal.classList.remove('active');
    if (claimScene) claimScene.setActive(false);
    if (claimForm) claimForm.reset();
    activeCouponId = null;
  }

  if (claimModalClose) {
    claimModalClose.addEventListener('click', closeClaimModal);
  }

  if (claimModal) {
    claimModal.addEventListener('click', (e) => {
      if (e.target === claimModal) closeClaimModal();
    });
  }

  // ─── Handle Claim Submission ──────────────────────────────────────────────
  if (claimForm) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!activeCouponId || claims[activeCouponId]) return;

      const itemName = document.getElementById('claim-item-name').value.trim();
      const amount = document.getElementById('claim-amount').value.trim();
      const note = document.getElementById('claim-note').value.trim();

      // A gift, direct money, or both — just need at least one.
      if (!itemName && !amount) return;

      const giftName = itemName || 'Pocket money surprise 💸';

      const claimRecord = {
        couponId: activeCouponId,
        itemName: giftName,
        amount: amount || '',
        note: note,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      // Save to localStorage
      claims[activeCouponId] = claimRecord;
      saveClaims(claims);

      // Trigger Celebration Confetti!
      triggerCelebrationConfetti();

      // Animate the 3D gift box popping gold
      if (giftScene) giftScene.markClaimed(activeCouponId);

      // Update card dots and remaining counter
      flashDot(activeCouponId);
      updateRemainingCounter();

      // Reveal the claims log on her first request, otherwise update in place
      if (!listRendered) {
        renderList();
        listRendered = true;
        const firstRow = rowEls.get(activeCouponId);
        if (firstRow) {
          firstRow.style.animationDelay = '0s';
          firstRow.classList.add('just-claimed');
          setTimeout(() => firstRow.classList.remove('just-claimed'), 1400);
        }
      } else {
        refreshRow(activeCouponId);
      }

      // Dispatch email notification, then celebrate
      await sendNotificationEmail(claimRecord, userEmail, emailEndpoint);
      if (giftScene && giftScene.showNotification) {
        giftScene.showNotification('Surprise Unwrapped! 💖', `Surprise #${activeCouponId} · ${claimRecord.itemName}`);
      }

      closeClaimModal();
    });
  }

  // ─── Wire up the single Redeem button ────────────────────────────────────
  if (redeemBtn) {
    redeemBtn.addEventListener('click', () => {
      if (getRemaining() === 0) return;
      // Auto-assign the next available request number
      for (let i = 1; i <= totalClaims; i++) {
        if (!claims[i]) {
          activeCouponId = i;
          break;
        }
      }
      if (activeCouponId) openClaimModal();
    });
  }

  // ─── Init: dots, remaining counter, and log (only if claims already exist) ─
  renderDots();
  updateRemainingCounter();
  if (getClaimedCount() > 0) {
    renderList();
    listRendered = true;
  }
}

// Send Notification via Formspree/EmailJS or fallback Mailto / WhatsApp link
async function sendNotificationEmail(claim, userEmail, endpoint) {
  const amountStr = claim.amount ? ` (₹${claim.amount})` : '';
  const subject = `💖 Birthday Surprise #${claim.couponId}: ${claim.itemName}${amountStr}`;
  const body = `Hi handsome! Your sweetheart just unwrapped Birthday Surprise #${claim.couponId}!\n\n` +
               `🎁 Surprise: ${claim.itemName}\n` +
               (claim.amount ? `💵 Amount: ₹${claim.amount}\n` : '') +
               `📅 Date: ${claim.date}\n` +
               `💬 Note: "${claim.note || 'None'}"\n\n` +
               `Please make this wish come true for her! ❤️`;

  // 1. If a form endpoint (Formspree/Google Apps Script) is configured, send
  //    the HTTP POST. If it succeeds, the request is recorded — no popup needed.
  let notified = false;
  if (endpoint && endpoint.startsWith('http')) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          couponId: claim.couponId,
          itemName: claim.itemName,
          amount: claim.amount,
          note: claim.note,
          email: userEmail
        })
      });
      notified = res.ok;
    } catch (err) {
      console.warn("API Email delivery failed, falling back to mailto", err);
    }
  }

  // Endpoint recorded the request — nothing else to do.
  if (notified) return;

  // 2. Fallback: prompt open mailto link if no endpoint was configured.
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:${userEmail}?subject=${encodedSubject}&body=${encodedBody}`;

  // Prompt option for immediate email or WhatsApp notification dispatch
  const sendEmail = window.confirm(
    `Surprise #${claim.couponId} unwrapped! 🎉\n\n` +
    `Click OK to open your email client and send this wish to ${userEmail} now!`
  );

  if (sendEmail) {
    window.location.href = mailtoUrl;
  }
}

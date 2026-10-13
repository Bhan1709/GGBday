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
  const claimDetailModal = document.getElementById('claim-detail-modal');
  const claimDetailClose = document.getElementById('claim-detail-close');
  const claimDetailContent = document.getElementById('claim-detail-content');
  const activeCouponTitle = document.getElementById('active-coupon-title');
  const attachmentInput = document.getElementById('claim-attachments');
  const attachmentPreviews = document.getElementById('claim-attachment-previews');

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
    let saved = {};
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) saved = JSON.parse(stored);
    } catch (e) {
      saved = {};
    }

    // Keep seeded claims in sync with config (this is the source of truth for
    // the claims it contains). Locally-created claims on other slots are kept.
    const seed = config.seedClaims || [];
    let changed = false;
    seed.forEach((seedClaim) => {
      if (JSON.stringify(saved[seedClaim.couponId]) !== JSON.stringify(seedClaim)) {
        saved[seedClaim.couponId] = seedClaim;
        changed = true;
      }
    });
    if (changed) saveClaims(saved);

    return saved;
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

    // Only claimed surprises appear in the log — no empty placeholders.
    const claimedIndices = Object.keys(claims)
      .map(Number)
      .sort((a, b) => a - b);

    claimedIndices.forEach((i) => {
      const row = document.createElement('div');
      row.className = 'claim-row';
      row.dataset.index = String(i);
      row.style.animationDelay = `${0.15 + i * 0.06}s`;
      claimsList.appendChild(row);
      rowEls.set(i, row);
      fillRow(row, i);
    });
  }

  function openClaimDetail(claim) {
    if (!claimDetailModal || !claimDetailContent) return;

    const attachments = claim.attachments && claim.attachments.length > 0
      ? claim.attachments.map(a => `<div style="word-break: break-all;">${escapeHtml(a)}</div>`).join('')
      : 'None';

    claimDetailContent.innerHTML = `
      <div class="claim-detail-item">
        <span class="claim-detail-label">Surprise #</span>
        <span class="claim-detail-value">${claim.couponId}</span>
      </div>
      <div class="claim-detail-item">
        <span class="claim-detail-label">What I Wanted</span>
        <span class="claim-detail-value">${escapeHtml(claim.itemName)}</span>
      </div>
      ${claim.amount ? `
      <div class="claim-detail-item">
        <span class="claim-detail-label">Amount</span>
        <span class="claim-detail-value">₹${escapeHtml(claim.amount)}</span>
      </div>` : ''}
      <div class="claim-detail-item">
        <span class="claim-detail-label">Date</span>
        <span class="claim-detail-value">${escapeHtml(claim.date)}</span>
      </div>
      ${claim.note ? `
      <div class="claim-detail-item">
        <span class="claim-detail-label">Note</span>
        <span class="claim-detail-value">${escapeHtml(claim.note)}</span>
      </div>` : ''}
      <div class="claim-detail-item">
        <span class="claim-detail-label">Attachments</span>
        <span class="claim-detail-value">${attachments}</span>
      </div>
    `;

    const modalBox = claimDetailModal.querySelector('.claim-modal-box');
    if (modalBox) modalBox.scrollTop = 0;
    claimDetailModal.classList.add('active');
  }

  function closeClaimDetail() {
    if (claimDetailModal) claimDetailModal.classList.remove('active');
  }

  if (claimDetailClose) {
    claimDetailClose.addEventListener('click', closeClaimDetail);
  }

  if (claimDetailModal) {
    claimDetailModal.addEventListener('click', (e) => {
      if (e.target === claimDetailModal) closeClaimDetail();
    });
  }

  function fillRow(row, index) {
    const claim = claims[index];

    if (claim) {
      row.classList.add('claimed');
      const title = claim.itemName.length > 50 ? claim.itemName.substring(0, 50) + '...' : claim.itemName;
      const amountPart = claim.amount ? `₹${escapeHtml(claim.amount)}` : '';
      const metaParts = [amountPart, escapeHtml(claim.date)].filter(Boolean);
      const meta = metaParts.join(' · ');
      row.innerHTML = `
        <span class="claim-row-num">#${index}</span>
        <div class="claim-row-info">
          <div class="claim-row-title" title="${escapeHtml(claim.itemName)}">${escapeHtml(title)}</div>
          ${meta ? `<div class="claim-row-meta">${meta}</div>` : ''}
        </div>
        <span class="claim-row-status claimed">✓ Unwrapped</span>
      `;
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        openClaimDetail(claim);
      });
    } else {
      row.innerHTML = `
        <span class="claim-row-num">#${index}</span>
        <div class="claim-row-info">
          <div class="claim-row-title available">Surprise #${index}</div>
          <div class="claim-row-meta">Waiting for your heart's desire</div>
        </div>
        <span class="claim-row-status available">🎁 Available</span>
      `;
      row.onclick = null;
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

  // ─── Attachment Previews ─────────────────────────────────────────────────
  let selectedFiles = [];

  function renderAttachmentPreviews() {
    if (!attachmentPreviews) return;
    attachmentPreviews.innerHTML = '';
    selectedFiles.forEach((file, idx) => {
      const chip = document.createElement('div');
      chip.className = 'attachment-chip';

      if (file.type && file.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.className = 'attachment-thumb';
        img.alt = file.name;
        img.src = URL.createObjectURL(file);
        chip.appendChild(img);
      } else {
        const icon = document.createElement('span');
        icon.className = 'attachment-icon';
        icon.textContent = '📎';
        chip.appendChild(icon);
      }

      const name = document.createElement('span');
      name.className = 'attachment-name';
      name.textContent = file.name;
      name.title = file.name;
      chip.appendChild(name);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'attachment-remove';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => {
        selectedFiles.splice(idx, 1);
        attachmentInput.value = '';
        const dt = new DataTransfer();
        selectedFiles.forEach((f) => dt.items.add(f));
        attachmentInput.files = dt.files;
        renderAttachmentPreviews();
      });
      chip.appendChild(remove);

      attachmentPreviews.appendChild(chip);
    });
  }

  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      selectedFiles = Array.from(attachmentInput.files || []);
      renderAttachmentPreviews();
    });
  }

  // ─── Claim Modal ──────────────────────────────────────────────────────────
  function openClaimModal() {
    if (getRemaining() === 0) return;
    if (activeCouponTitle) {
      activeCouponTitle.textContent = `Unwrap Surprise #${activeCouponId}`;
    }
    const modalBox = claimModal?.querySelector('.claim-modal-box');
    if (modalBox) {
      // Force reset scroll
      modalBox.scrollTop = 0;
    }
    if (claimModal) {
      claimModal.classList.add('active');
      // Ensure scroll works after opening
      setTimeout(() => {
        if (modalBox) modalBox.scrollTop = 0;
      }, 10);
    }
    if (claimScene) claimScene.setActive(true);
  }

  function closeClaimModal() {
    if (claimModal) claimModal.classList.remove('active');
    if (claimScene) claimScene.setActive(false);
    if (claimForm) {
      claimForm.reset();
      const existingErrors = claimForm.querySelectorAll('.form-error');
      existingErrors.forEach(err => err.remove());
      const itemInput = document.getElementById('claim-item-name');
      const amountInput = document.getElementById('claim-amount');
      if (itemInput) itemInput.style.borderColor = '';
      if (amountInput) amountInput.style.borderColor = '';
    }
    selectedFiles = [];
    if (attachmentPreviews) attachmentPreviews.innerHTML = '';
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

  // Ensure modal scroll resets properly
  if (claimModal) {
    claimModal.addEventListener('transitionend', (e) => {
      const modalBox = claimModal.querySelector('.claim-modal-box');
      if (modalBox) {
        modalBox.scrollTop = 0;
      }
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

      // Remove any existing error messages
      const existingErrors = claimForm.querySelectorAll('.form-error');
      existingErrors.forEach(err => err.remove());

      // Clear error from inputs
      document.getElementById('claim-item-name').style.borderColor = '';
      document.getElementById('claim-amount').style.borderColor = '';

      // A gift, direct money, or both — just need at least one.
      if (!itemName && !amount) {
        const amountGroup = document.getElementById('claim-amount').closest('.form-group');
        const errorDiv = document.createElement('p');
        errorDiv.className = 'form-error';
        errorDiv.textContent = 'Please tell me what you want or enter an amount 💌';
        amountGroup.appendChild(errorDiv);
        document.getElementById('claim-item-name').style.borderColor = '#ff8a8a';
        document.getElementById('claim-amount').style.borderColor = '#ff8a8a';
        amountGroup.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      const giftName = itemName || 'Pocket money surprise 💸';

      const requestFiles = attachmentInput ? Array.from(attachmentInput.files || []) : [];

      const claimRecord = {
        couponId: activeCouponId,
        itemName: giftName,
        amount: amount || '',
        note: note,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        attachments: requestFiles.map((f) => f.name)
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
      await sendNotificationEmail(claimRecord, userEmail, emailEndpoint, requestFiles);
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
async function sendNotificationEmail(claim, userEmail, endpoint, files = []) {
  const amountStr = claim.amount ? ` (₹${claim.amount})` : '';
  const subject = `💖 Birthday Surprise #${claim.couponId}: ${claim.itemName}${amountStr}`;
  const body = `Hi handsome! Your sweetheart just unwrapped Birthday Surprise #${claim.couponId}!\n\n` +
               `🎁 Surprise: ${claim.itemName}\n` +
               (claim.amount ? `💵 Amount: ₹${claim.amount}\n` : '') +
               `📅 Date: ${claim.date}\n` +
               `💬 Note: "${claim.note || 'None'}"\n` +
               (files.length ? `📎 Attachments: ${files.map((f) => f.name).join(', ')}\n` : '') +
               `\nPlease make this wish come true for her! ❤️`;

  // 1. If a form endpoint (Formspree/Google Apps Script) is configured, send
  //    the submission. Files travel as multipart "attachment" fields so they
  //    arrive attached to the notification email. If it succeeds, the request
  //    is recorded — no popup needed.
  let notified = false;
  if (endpoint && endpoint.startsWith('http')) {
    try {
      const attrs = {
        couponId: claim.couponId,
        itemName: claim.itemName,
        amount: claim.amount,
        note: claim.note,
        email: userEmail
      };

      let res;
      if (files.length > 0) {
        const formData = new FormData();
        Object.entries(attrs).forEach(([key, value]) => formData.append(key, value ?? ''));
        files.forEach((file) => formData.append('attachment', file));
        res = await fetch(endpoint, { method: 'POST', body: formData });
      } else {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(attrs)
        });
      }
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

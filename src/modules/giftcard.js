import { triggerCelebrationConfetti } from './confetti.js';

const LOCAL_STORAGE_KEY = 'birthday_giftcard_claims_v1';

export function initGiftCards(config) {
  const totalClaims = config.totalClaimsAllowed || 12;
  const expiryDate = config.claimExpiryDate || "August 13, 2027";
  const userEmail = config.notificationEmail || "your-email@example.com";
  const emailEndpoint = config.emailEndpoint || "";

  const gridContainer = document.getElementById('coupons-grid');
  const remainingBadge = document.getElementById('remaining-claims-count');
  const claimModal = document.getElementById('claim-modal');
  const claimForm = document.getElementById('claim-form');
  const claimModalClose = document.getElementById('claim-modal-close');
  const activeCouponTitle = document.getElementById('active-coupon-title');

  if (!gridContainer) return;

  // Load existing claims from LocalStorage
  let claims = getSavedClaims();

  let activeCouponId = null;

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

  function updateRemainingCounter() {
    const claimedCount = Object.keys(claims).length;
    const remaining = Math.max(0, totalClaims - claimedCount);
    if (remainingBadge) {
      remainingBadge.textContent = remaining;
    }
  }

  function renderCoupons() {
    updateRemainingCounter();
    gridContainer.innerHTML = '';

    for (let i = 1; i <= totalClaims; i++) {
      const isClaimed = !!claims[i];
      const claimData = claims[i];

      const card = document.createElement('div');
      card.className = `coupon-card ${isClaimed ? 'claimed' : ''}`;
      
      card.innerHTML = `
        <div class="coupon-header">
          <span class="coupon-num">Gift Card #${i}</span>
          <span class="coupon-status-badge ${isClaimed ? 'claimed' : 'available'}">
            ${isClaimed ? '✓ Claimed' : '🎁 Available'}
          </span>
        </div>
        <div class="coupon-title">${isClaimed ? claimData.itemName : `Transfer Request #${i}`}</div>
        <div class="coupon-desc">
          ${isClaimed 
            ? `Requested: <strong>$${claimData.amount}</strong>` 
            : `Valid for any gift or money transfer wish until ${expiryDate}.`}
        </div>
        
        ${isClaimed ? `
          <div class="coupon-claimed-details">
            📅 Redeemed: ${claimData.date}<br/>
            💬 Note: "${claimData.note || 'No note'}"
          </div>
        ` : `
          <button class="btn-primary btn-gold redeem-btn" data-id="${i}" style="margin-top: auto;">
            Redeem Transfer 💖
          </button>
        `}
      `;

      gridContainer.appendChild(card);
    }

    // Attach click handlers to redeem buttons
    gridContainer.querySelectorAll('.redeem-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.getAttribute('data-id'), 10);
        openClaimModal(id);
      });
    });
  }

  function openClaimModal(couponId) {
    activeCouponId = couponId;
    if (activeCouponTitle) {
      activeCouponTitle.textContent = `Redeem Gift Card #${couponId}`;
    }
    if (claimModal) {
      claimModal.classList.add('active');
    }
  }

  function closeClaimModal() {
    if (claimModal) {
      claimModal.classList.remove('active');
    }
    if (claimForm) {
      claimForm.reset();
    }
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

  // Handle Claim Submission
  if (claimForm) {
    claimForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!activeCouponId) return;

      const itemName = document.getElementById('claim-item-name').value.trim();
      const amount = document.getElementById('claim-amount').value.trim();
      const note = document.getElementById('claim-note').value.trim();

      if (!itemName || !amount) return;

      const claimRecord = {
        couponId: activeCouponId,
        itemName: itemName,
        amount: amount,
        note: note,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };

      // Save to localStorage
      claims[activeCouponId] = claimRecord;
      saveClaims(claims);

      // Trigger Confetti Celebration!
      triggerCelebrationConfetti();

      // Dispatch Email or generate fallback links
      await sendNotificationEmail(claimRecord, userEmail, emailEndpoint);

      closeClaimModal();
      renderCoupons();
    });
  }

  renderCoupons();
}

// Send Notification via Formspree/EmailJS or fallback Mailto / WhatsApp link
async function sendNotificationEmail(claim, userEmail, endpoint) {
  const subject = `💖 Birthday Gift Request #${claim.couponId}: ${claim.itemName} ($${claim.amount})`;
  const body = `Hi handsome! Your sweetheart just redeemed Birthday Gift Card #${claim.couponId}!\n\n` +
               `🎁 Requested Item: ${claim.itemName}\n` +
               `💵 Transfer Amount: $${claim.amount}\n` +
               `📅 Date: ${claim.date}\n` +
               `💬 Note: "${claim.note || 'None'}"\n\n` +
               `Please process the transfer for her! ❤️`;

  // 1. If custom endpoint (e.g. Formspree/FormSubmit) is provided, send HTTP POST
  if (endpoint && endpoint.startsWith('http')) {
    try {
      await fetch(endpoint, {
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
    } catch (err) {
      console.warn("API Email delivery failed, falling back to mailto", err);
    }
  }

  // 2. Automatically prompt open mailto link or fallback notification window
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  const mailtoUrl = `mailto:${userEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  
  // Prompt option for immediate email or WhatsApp notification dispatch
  const sendEmail = window.confirm(
    `Gift Card #${claim.couponId} Redeemed Successfully! 🎉\n\n` +
    `Click OK to open your email client to send the transfer request notification to ${userEmail} now!`
  );

  if (sendEmail) {
    window.location.href = mailtoUrl;
  }
}

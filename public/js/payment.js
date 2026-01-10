/*
 * Payment (prep) page
 *
 * Important: payment enforcement is intentionally NOT enabled yet.
 * This page only prepares the flow and stores the chosen package + a draft purchase record.
 */

(function () {
  const PLAN_DEFS = {
    digital: {
      name: 'Digital Only',
      priceCents: 0,
      currency: 'usd',
      notes: 'Free – download PDF & share.',
    },
    softcover: {
      name: 'Softcover Print',
      priceCents: 2900,
      currency: 'usd',
      notes: 'Print package (shipping handled later).',
    },
    hardcover: {
      name: 'Hardcover Premium',
      priceCents: 5900,
      currency: 'usd',
      notes: 'Premium package (shipping handled later).',
    },
  };

  const STORAGE_KEYS = {
    selectedPlan: 'shoso:selectedPlan',
    purchaseDraftId: 'shoso:purchaseDraftId',
    purchaseStatus: 'shoso:purchaseStatus', // 'draft' | 'bypassed'
    continueUrl: 'shoso:continueUrl',
  };

  const qs = new URLSearchParams(window.location.search);
  const planKey = (qs.get('plan') || 'softcover').toLowerCase();
  const plan = PLAN_DEFS[planKey] || PLAN_DEFS.softcover;

  const redirect = qs.get('redirect') || '/index.html';
  const continueUrl = redirect;

  // UI elements
  const elPlanName = document.getElementById('planName');
  const elPlanPrice = document.getElementById('planPrice');
  const elPlanNotes = document.getElementById('planNotes');
  const elPlanKey = document.getElementById('planKey');
  const elDraftId = document.getElementById('draftId');
  const elContinueUrl = document.getElementById('continueUrl');
  const continueLinkTop = document.getElementById('continueLinkTop');

  const testingBanner = document.getElementById('testingBanner');
  const btnCreateDraft = document.getElementById('btnCreateDraft');
  const btnSkip = document.getElementById('btnSkip');

  const authStatus = document.getElementById('authStatus');
  const btnSignIn = document.getElementById('btnSignIn');
  const btnSignOut = document.getElementById('btnSignOut');

  function formatPrice(cents, currency) {
    if (typeof cents !== 'number' || cents <= 0) return 'Free';
    const amount = (cents / 100).toFixed(2);
    return `$${amount} ${String(currency || 'usd').toUpperCase()}`;
  }

  function setText(idOrEl, text) {
    const el = typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
    if (el) el.textContent = text;
  }

  function persistSelection(meta) {
    try {
      localStorage.setItem(STORAGE_KEYS.selectedPlan, planKey);
      localStorage.setItem(STORAGE_KEYS.continueUrl, continueUrl);
      if (meta && meta.purchaseDraftId) {
        localStorage.setItem(STORAGE_KEYS.purchaseDraftId, String(meta.purchaseDraftId));
      }
      if (meta && meta.purchaseStatus) {
        localStorage.setItem(STORAGE_KEYS.purchaseStatus, String(meta.purchaseStatus));
      }
    } catch (e) {
      // localStorage may be blocked
      console.warn('Failed to persist payment selection:', e);
    }
  }

  function goToEditor() {
    window.location.href = continueUrl;
  }

  function initSummary() {
    setText(elPlanName, plan.name);
    setText(elPlanPrice, formatPrice(plan.priceCents, plan.currency));
    setText(elPlanNotes, plan.notes);
    setText(elPlanKey, planKey);
    setText(elContinueUrl, continueUrl);
    if (continueLinkTop) continueLinkTop.setAttribute('href', continueUrl);

    // Always show testing banner (per request: allow entering without payment)
    if (testingBanner) testingBanner.style.display = 'block';

    // Restore last draft id if present
    try {
      const existing = localStorage.getItem(STORAGE_KEYS.purchaseDraftId);
      if (existing) setText(elDraftId, existing);
    } catch {
      // ignore
    }
  }

  // Firebase Functions helper (copied pattern from app.js)
  const functions = firebase.functions();
  if (window.location.hostname === 'localhost') {
    functions.useEmulator('localhost', 5001);
  }

  async function callFunction(name, data = {}) {
    const callable = functions.httpsCallable(name);
    const result = await callable(data);
    return result.data;
  }

  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
    provider.addScope('https://www.googleapis.com/auth/presentations');
    provider.addScope('https://www.googleapis.com/auth/drive');
    await firebase.auth().signInWithPopup(provider);
  }

  async function createDraft() {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert('Please sign in first.');
      return;
    }

    // Create a draft purchase record that later checkout providers can update
    const draft = {
      provider: 'manual',
      currency: plan.currency,
      amount: plan.priceCents,
      description: `Package: ${plan.name}`,
      projectId: null,
      projectTitle: null,
      meta: {
        plan: planKey,
        allowBypass: true,
        source: 'payment.html',
      },
    };

    btnCreateDraft.disabled = true;
    btnCreateDraft.textContent = 'Creating draft…';

    try {
      const result = await callFunction('createPurchaseDraft', { draft });
      const purchaseDraftId = result && result.purchaseId ? result.purchaseId : null;
      if (purchaseDraftId) {
        setText(elDraftId, purchaseDraftId);
        persistSelection({ purchaseDraftId, purchaseStatus: 'draft' });
      } else {
        persistSelection({ purchaseStatus: 'draft' });
      }

      // Continue to editor
      goToEditor();
    } catch (e) {
      console.error('Failed to create draft:', e);
      alert('Failed to create purchase draft: ' + (e.message || 'Unknown error'));
    } finally {
      btnCreateDraft.disabled = false;
      btnCreateDraft.textContent = 'Create purchase draft (prep)';
    }
  }

  function skipPayment() {
    persistSelection({ purchaseStatus: 'bypassed' });
    goToEditor();
  }

  function wireAuthUI() {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        authStatus.textContent = `Signed in as ${user.email || user.uid}`;
        btnSignIn.style.display = 'none';
        btnSignOut.style.display = 'inline-flex';
      } else {
        authStatus.textContent = 'Not signed in';
        btnSignIn.style.display = 'inline-flex';
        btnSignOut.style.display = 'none';
      }
    });

    btnSignIn.addEventListener('click', async () => {
      try {
        await signInWithGoogle();
      } catch (e) {
        console.error('Sign-in failed:', e);
        alert('Sign-in failed: ' + (e.message || 'Unknown error'));
      }
    });

    btnSignOut.addEventListener('click', async () => {
      try {
        await firebase.auth().signOut();
      } catch (e) {
        console.warn('Sign-out failed:', e);
      }
    });
  }

  function wireActions() {
    btnCreateDraft.addEventListener('click', createDraft);
    btnSkip.addEventListener('click', skipPayment);
  }

  initSummary();
  wireAuthUI();
  wireActions();
})();







// ==========================================
// SUPABASE SETUP — Replace with your project
// ==========================================
var SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
var SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

var supabaseClient = null;
var supabaseUser = null;

if (typeof supabase !== 'undefined') {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ========== AUTH STATE ==========
  supabaseClient.auth.onAuthStateChange(function(event, session) {
    supabaseUser = session ? session.user : null;
    updateAuthUI();
    if (supabaseUser) {
      ensureProfile(supabaseUser);
    }
  });

  function getCurrentUser() {
    return supabaseUser;
  }

  async function ensureProfile(user) {
    var { data, error } = await supabaseClient.from('profiles').select('id').eq('id', user.id).single();
    if (error || !data) {
      await supabaseClient.from('profiles').upsert({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        photo: user.user_metadata?.avatar_url || '',
        email: user.email
      });
    }
  }

  // ========== GOOGLE LOGIN ==========
  window.supabaseLogin = async function() {
    var { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) console.error('Login error:', error);
  };

  window.supabaseLogout = async function() {
    await supabaseClient.auth.signOut();
  };

  // ========== SYNC FUNCTIONS ==========

  // Save paper result
  window.syncResult = async function(result) {
    if (!supabaseUser) return;
    var { error } = await supabaseClient.from('results').insert({
      user_id: supabaseUser.id,
      exam: result.exam,
      paper_id: result.paperId,
      correct: result.correct,
      wrong: result.wrong,
      total: result.total,
      answered: result.answered,
      pct: result.pct,
      time: result.time
    });
    // Also update leaderboard (keep only best per exam)
    if (!error) {
      await supabaseClient.from('leaderboard').insert({
        user_id: supabaseUser.id,
        name: supabaseUser.user_metadata?.full_name || 'User',
        photo: supabaseUser.user_metadata?.avatar_url || '',
        exam: result.exam,
        score: result.correct,
        total: result.total,
        pct: result.pct
      });
    }
  };

  // Save wrong answer
  window.syncWrongAnswer = async function(item) {
    if (!supabaseUser) return;
    await supabaseClient.from('wrong_answers').insert({
      user_id: supabaseUser.id,
      paper_id: item.paperId,
      exam: item.exam,
      q_num: item.qNum,
      q_text: item.qText,
      correct: item.correct,
      chosen: item.chosen,
      difficulty: item.difficulty,
      section: item.section
    });
  };

  // Save bookmark
  window.syncBookmark = async function(item, isRemoving) {
    if (!supabaseUser) return;
    if (isRemoving) {
      await supabaseClient.from('bookmarks').delete().match({ user_id: supabaseUser.id, paper_id: item.paperId, q_num: item.qNum });
    } else {
      await supabaseClient.from('bookmarks').upsert({
        user_id: supabaseUser.id,
        paper_id: item.paperId,
        exam: item.exam,
        q_num: item.qNum,
        q_text: item.qText,
        section: item.section
      }, { onConflict: 'user_id,paper_id,q_num' });
    }
  };

  // Sync streak
  window.syncStreak = async function(streak) {
    if (!supabaseUser) return;
    await supabaseClient.from('profiles').update({
      streak_current: streak.current,
      streak_longest: streak.longest,
      streak_last_date: streak.lastDate
    }).eq('id', supabaseUser.id);
  };

  // Sync badges
  window.syncBadges = async function(badges) {
    if (!supabaseUser) return;
    await supabaseClient.from('profiles').update({ badges: JSON.stringify(badges) }).eq('id', supabaseUser.id);
  };

  // Sync goals
  window.syncGoals = async function(goals) {
    if (!supabaseUser) return;
    await supabaseClient.from('profiles').update({ goals: JSON.stringify(goals) }).eq('id', supabaseUser.id);
  };

  // ========== LOAD USER DATA ==========
  window.loadUserData = async function(callback) {
    if (!supabaseUser) { if (callback) callback(null); return; }
    var uid = supabaseUser.id;

    var [profileRes, resultsRes, wrongRes, bookmarksRes] = await Promise.all([
      supabaseClient.from('profiles').select('*').eq('id', uid).single(),
      supabaseClient.from('results').select('*').eq('user_id', uid).order('date', { ascending: false }).limit(50),
      supabaseClient.from('wrong_answers').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(200),
      supabaseClient.from('bookmarks').select('*').eq('user_id', uid)
    ]);

    var data = {};
    if (!profileRes.error) data.profile = profileRes.data;
    if (!resultsRes.error) data.results = resultsRes.data;
    if (!wrongRes.error) data.wrongAnswers = wrongRes.data;
    if (!bookmarksRes.error) data.bookmarks = bookmarksRes.data;

    if (data.profile) {
      data.profile.badges = typeof data.profile.badges === 'string' ? JSON.parse(data.profile.badges || '[]') : (data.profile.badges || []);
      data.profile.goals = typeof data.profile.goals === 'string' ? JSON.parse(data.profile.goals || '{}') : (data.profile.goals || {});
    }

    if (callback) callback(data);
  };

  // ========== LEADERBOARD ==========
  window.getLeaderboard = async function(examFilter, callback) {
    var q = supabaseClient.from('leaderboard').select('*');
    if (examFilter && examFilter !== 'all') q = q.eq('exam', examFilter);
    var { data, error } = await q.order('pct', { ascending: false }).limit(50);
    if (callback) callback(data || [], error);
  };

  // ========== UI UPDATE ==========
  function updateAuthUI() {
    document.querySelectorAll('.auth-btn').forEach(function(el) {
      if (supabaseUser) {
        var name = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';
        var photo = supabaseUser.user_metadata?.avatar_url || '';
        el.innerHTML = photo ? '<img src="'+photo+'" style="width:22px;height:22px;border-radius:50%;vertical-align:middle;margin-right:6px">'+name : name;
        el.onclick = function(e) {
          e.preventDefault();
          if (confirm('Logout?')) window.supabaseLogout();
        };
        el.style.padding = '4px 12px 4px 4px';
      } else {
        el.innerHTML = 'Login';
        el.onclick = function(e) { e.preventDefault(); window.supabaseLogin(); };
        el.style.padding = '';
      }
    });
  }

  // check initial session
  supabaseClient.auth.getSession().then(function(res) {
    if (res.data.session) {
      supabaseUser = res.data.session.user;
      updateAuthUI();
      ensureProfile(supabaseUser);
    }
  });
} else {
  console.warn('Supabase SDK not loaded');
}
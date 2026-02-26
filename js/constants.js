/**
 * テニスローテーション表ジェネレーター - 定数定義
 *
 * ポジション1～4選択方式を採用：
 * - ポジション1：主役プレイヤー
 * - ポジション2：ポジション1のペアプレイヤー
 * - ポジション3：対戦主役プレイヤー
 * - ポジション4：ポジション3のペアプレイヤー
 */

// ===============================================
// URLパラメータユーティリティ
// ===============================================

/**
 * URLパラメータを取得
 */
function getUrlParameter(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/**
 * デバッグモードが有効か判定
 */
function isDebugMode() {
  return getUrlParameter("debug") === "true";
}

// ===============================================
// スコア計算の重み設定
// ===============================================

const SCORING_WEIGHTS = {
  // ========== ポジション1～4選択用の重み設定 ==========

  // ポジション1：主役プレイヤー選択
  // 評価基準：出場回数、連続待機回数、プレイヤー番号
  POS1_PLAY_COUNT: -120, // 出場回数の重み（負値：少ないほど高評価）
  POS1_CONSECUTIVE_REST: 20, // 連続待機回数の重み（正値：多いほど高評価）
  POS1_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション2：ポジション1のペアプレイヤー選択
  // 評価基準：ポジション1との関係（ペア・対戦回数）、出場回数、連続待機回数、プレイヤー番号
  POS2_PARTNER_HISTORY: -60, // ポジション1とのペア回数の重み（負値：少ないほど高評価）
  POS2_MATCH_HISTORY: -40, // ポジション1との対戦回数の重み（負値：少ないほど高評価）
  POS2_PLAY_COUNT: -80, // 出場回数の重み（負値：少ないほど高評価）
  POS2_CONSECUTIVE_REST: 15, // 連続待機回数の重み（正値：多いほど高評価）
  POS2_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション3：対戦主役プレイヤー選択
  // 評価基準：ポジション1/2との関係、出場回数、連続待機回数、プレイヤー番号
  POS3_PARTNER_HISTORY: -50, // ペア回数の重み（負値：少ないほど高評価）
  POS3_MATCH_HISTORY: -35, // 対戦回数の重み（負値：少ないほど高評価）
  POS3_PLAY_COUNT: -70, // 出場回数の重み（負値：少ないほど高評価）
  POS3_CONSECUTIVE_REST: 15, // 連続待機回数の重み（正値：多いほど高評価）
  POS3_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション4：ポジション3のペアプレイヤー選択
  // 評価基準：ポジション1/2/3との関係、出場回数、連続待機回数、プレイヤー番号
  POS4_PARTNER_HISTORY: -50, // ペア回数の重み（負値：少ないほど高評価）
  POS4_MATCH_HISTORY: -35, // 対戦回数の重み（負値：少ないほど高評価）
  POS4_PLAY_COUNT: -70, // 出場回数の重み（負値：少ないほど高評価）
  POS4_CONSECUTIVE_REST: 15, // 連続待機回数の重み（正値：多いほど高評価）
  POS4_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // 連続で同じ相手との対戦/ペアを避けるためのペナルティ
  CONSECUTIVE_PARTNER_PENALTY: -120, // 直前ラウンドと同じペアは減点
  CONSECUTIVE_OPPONENT_PENALTY: -80, // 直前ラウンドと同じ対戦相手は減点

  // ========== 男女混合重視用の追加重み ==========
  MIXED_BONUS: 15, // 男女混合ペアのボーナス（正値：男女混合は高評価）
};

// ========== 対戦方式別の重み設定プリセット ==========
const SCORING_WEIGHTS_PRESETS = {
  // バランス型（推奨）
  // 出場機会の公平性と多様性のバランスを重視
  balanced: {
    POS1_PLAY_COUNT: -100,
    POS1_CONSECUTIVE_REST: 50,
    POS1_PLAYER_NUMBER: -0.01,

    POS2_PARTNER_HISTORY: -40,
    POS2_MATCH_HISTORY: -10,
    POS2_PLAY_COUNT: -80,
    POS2_CONSECUTIVE_REST: 40,
    POS2_PLAYER_NUMBER: -0.01,

    POS3_PLAY_COUNT: -80,
    POS3_CONSECUTIVE_REST: 40,
    POS3_PARTNER_HISTORY: -30,
    POS3_MATCH_HISTORY: -20,
    POS3_PLAYER_NUMBER: -0.01,

    POS4_PLAY_COUNT: -80,
    POS4_CONSECUTIVE_REST: 40,
    POS4_PARTNER_HISTORY: -30,
    POS4_MATCH_HISTORY: -20,

    MIXED_BONUS: 20,

    CONSECUTIVE_PARTNER_PENALTY: -120,
    CONSECUTIVE_OPPONENT_PENALTY: -100,
  },

  // 多様性重視型
  // ペアと対戦の組み合わせバリエーションを最優先
  diversity: {
    POS1_PLAY_COUNT: -60,
    POS1_CONSECUTIVE_REST: 30,
    POS1_PLAYER_NUMBER: -0.01,

    POS2_PARTNER_HISTORY: -200,
    POS2_MATCH_HISTORY: -50,
    POS2_PLAY_COUNT: -50,
    POS2_CONSECUTIVE_REST: 20,
    POS2_PLAYER_NUMBER: -0.01,

    POS3_PARTNER_HISTORY: -100,
    POS3_MATCH_HISTORY: -150,
    POS3_PLAY_COUNT: -50,
    POS3_CONSECUTIVE_REST: 20,
    POS3_PLAYER_NUMBER: -0.01,

    POS4_PARTNER_HISTORY: -100,
    POS4_MATCH_HISTORY: -150,
    POS4_PLAY_COUNT: -50,
    POS4_CONSECUTIVE_REST: 20,

    MIXED_BONUS: 20,

    CONSECUTIVE_PARTNER_PENALTY: -120,
    CONSECUTIVE_OPPONENT_PENALTY: -100,
  },

  // 男女混合重視型
  // 男女混合ペアの出場機会を優先的に増やす
  mixed: {
    POS1_PLAY_COUNT: -100,
    POS1_CONSECUTIVE_REST: 50,
    POS1_PLAYER_NUMBER: -0.01,

    POS2_PARTNER_HISTORY: -30,
    POS2_MATCH_HISTORY: -10,
    POS2_PLAY_COUNT: -70,
    POS2_CONSECUTIVE_REST: 30,
    POS2_PLAYER_NUMBER: -0.01,

    POS3_PLAY_COUNT: -70,
    POS3_CONSECUTIVE_REST: 30,
    POS3_PARTNER_HISTORY: -20,
    POS3_MATCH_HISTORY: -10,
    POS3_PLAYER_NUMBER: -0.01,

    POS4_PLAY_COUNT: -70,
    POS4_CONSECUTIVE_REST: 30,
    POS4_PARTNER_HISTORY: -20,
    POS4_MATCH_HISTORY: -10,

    MIXED_BONUS: 100,

    CONSECUTIVE_PARTNER_PENALTY: -120,
    CONSECUTIVE_OPPONENT_PENALTY: -100,
  },

  // カスタマイズ方式
  // バランス型をベースに、ユーザーが重みを手動調整
  custom: {
    POS1_PLAY_COUNT: -100,
    POS1_CONSECUTIVE_REST: 50,
    POS1_PLAYER_NUMBER: -0.01,

    POS2_PARTNER_HISTORY: -40,
    POS2_MATCH_HISTORY: -10,
    POS2_PLAY_COUNT: -80,
    POS2_CONSECUTIVE_REST: 40,
    POS2_PLAYER_NUMBER: -0.01,

    POS3_PLAY_COUNT: -80,
    POS3_CONSECUTIVE_REST: 40,
    POS3_PARTNER_HISTORY: -30,
    POS3_MATCH_HISTORY: -20,
    POS3_PLAYER_NUMBER: -0.01,

    POS4_PLAY_COUNT: -80,
    POS4_CONSECUTIVE_REST: 40,
    POS4_PARTNER_HISTORY: -30,
    POS4_MATCH_HISTORY: -20,
    POS4_PLAYER_NUMBER: -0.01,

    MIXED_BONUS: 20,

    CONSECUTIVE_PARTNER_PENALTY: -120,
    CONSECUTIVE_OPPONENT_PENALTY: -100,
  },
};

// ========== 最小プレイヤー数 ==========
const MIN_PLAYERS = {
  DOUBLES: 4, // ダブルスには最低4人必要（2vs2）
};

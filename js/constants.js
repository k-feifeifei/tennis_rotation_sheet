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
  POS1_PLAY_COUNT: 120, // 出場回数の重み
  POS1_CONSECUTIVE_REST: 20, // 連続待機回数の重み（マイナス）
  POS1_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション2：ポジション1のペアプレイヤー選択
  // 評価基準：ポジション1との関係（ペア・対戦回数）、出場回数、連続待機回数、プレイヤー番号
  POS2_PARTNER_HISTORY: 60, // ポジション1とのペア回数の重み
  POS2_MATCH_HISTORY: 40, // ポジション1との対戦回数の重み
  POS2_PLAY_COUNT: 80, // 出場回数の重み
  POS2_CONSECUTIVE_REST: 15, // 連続待機回数の重み
  POS2_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション3：対戦主役プレイヤー選択
  // 評価基準：ポジション1/2との関係、出場回数、連続待機回数、プレイヤー番号
  POS3_PARTNER_HISTORY: 50, // ペア回数の重み（ポジション1・2の相手との）
  POS3_MATCH_HISTORY: 35, // 対戦回数の重み（ポジション1・2の相手との）
  POS3_PLAY_COUNT: 70, // 出場回数の重み
  POS3_CONSECUTIVE_REST: 15, // 連続待機回数の重み
  POS3_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ポジション4：ポジション3のペアプレイヤー選択
  // 評価基準：ポジション1/2/3との関係、出場回数、連続待機回数、プレイヤー番号
  POS4_PARTNER_HISTORY: 50, // ペア回数の重み（ポジション1/2/3の相手との）
  POS4_MATCH_HISTORY: 35, // 対戦回数の重み（ポジション1/2/3の相手との）
  POS4_PLAY_COUNT: 70, // 出場回数の重み
  POS4_CONSECUTIVE_REST: 15, // 連続待機回数の重み
  POS4_PLAYER_NUMBER: -0.01, // プレイヤー番号の重み（負値：番号が小さいほど高評価）

  // ========== 男女混合重視用の追加重み ==========
  MIXED_BONUS: 100, // 男女混合ペアのボーナス
};

// ========== 対戦方式別の重み設定プリセット ==========
const SCORING_WEIGHTS_PRESETS = {
  // バランス型（推奨）
  // 出場機会の公平性と多様性のバランスを重視
  balanced: {
    POS1_PLAY_COUNT: 120,
    POS1_CONSECUTIVE_REST: 20,
    POS1_PLAYER_NUMBER: -0.01,
    POS2_PARTNER_HISTORY: 60,
    POS2_MATCH_HISTORY: 40,
    POS2_PLAY_COUNT: 80,
    POS2_CONSECUTIVE_REST: 15,
    POS2_PLAYER_NUMBER: -0.01,
    POS3_PARTNER_HISTORY: 50,
    POS3_MATCH_HISTORY: 35,
    POS3_PLAY_COUNT: 70,
    POS3_CONSECUTIVE_REST: 15,
    POS3_PLAYER_NUMBER: -0.01,
    POS4_PARTNER_HISTORY: 50,
    POS4_MATCH_HISTORY: 35,
    POS4_PLAY_COUNT: 70,
    POS4_CONSECUTIVE_REST: 15,
    POS4_PLAYER_NUMBER: -0.01,
    MIXED_BONUS: 100,
  },

  // 多様性重視型
  // ペアと対戦の組み合わせバリエーションを最優先
  // 出場回数、ペア履歴、対戦履歴をほぼ同じ重みで評価
  diversity: {
    POS1_PLAY_COUNT: 100,
    POS1_CONSECUTIVE_REST: 20,
    POS1_PLAYER_NUMBER: -0.01,
    POS2_PARTNER_HISTORY: 100,
    POS2_MATCH_HISTORY: 100,
    POS2_PLAY_COUNT: 100,
    POS2_CONSECUTIVE_REST: 15,
    POS2_PLAYER_NUMBER: -0.01,
    POS3_PARTNER_HISTORY: 100,
    POS3_MATCH_HISTORY: 100,
    POS3_PLAY_COUNT: 100,
    POS3_CONSECUTIVE_REST: 15,
    POS3_PLAYER_NUMBER: -0.01,
    POS4_PARTNER_HISTORY: 100,
    POS4_MATCH_HISTORY: 100,
    POS4_PLAY_COUNT: 100,
    POS4_CONSECUTIVE_REST: 15,
    POS4_PLAYER_NUMBER: -0.01,
    MIXED_BONUS: 100,
  },

  // 男女混合重視型
  // 男女混合ペアの出場機会を優先的に増やす
  mixed: {
    POS1_PLAY_COUNT: 120,
    POS1_CONSECUTIVE_REST: 20,
    POS1_PLAYER_NUMBER: -0.01,
    POS2_PARTNER_HISTORY: 60,
    POS2_MATCH_HISTORY: 40,
    POS2_PLAY_COUNT: 80,
    POS2_CONSECUTIVE_REST: 15,
    POS2_PLAYER_NUMBER: -0.01,
    POS3_PARTNER_HISTORY: 50,
    POS3_MATCH_HISTORY: 35,
    POS3_PLAY_COUNT: 70,
    POS3_CONSECUTIVE_REST: 15,
    POS3_PLAYER_NUMBER: -0.01,
    POS4_PARTNER_HISTORY: 50,
    POS4_MATCH_HISTORY: 35,
    POS4_PLAY_COUNT: 70,
    POS4_CONSECUTIVE_REST: 15,
    POS4_PLAYER_NUMBER: -0.01,
    MIXED_BONUS: 200, // ボーナスを大幅に増加
  },
};

// ========== 最小プレイヤー数 ==========
const MIN_PLAYERS = {
  DOUBLES: 4, // ダブルスには最低4人必要（2vs2）
};

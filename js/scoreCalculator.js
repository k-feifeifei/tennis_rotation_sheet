/**
 * テニスダブルスローテーション表ジェネレーター - スコア計算クラス
 *
 * ポジション1～4の各プレイヤー選択に際して、候補者の評価スコアを計算します。
 * 評価基準：
 * - ペア履歴（同じペアの繰り返しを避ける）
 * - 対戦履歴（同じ対戦相手の繰り返しを避ける）
 * - 出場回数（公平性の維持）
 * - ミックスボーナス（男女ペアの優遇）
 * - その他の調整係数
 */

class ScoreCalculator {
  /**
   * ペア候補のスコアを計算（ポジション2/3/4選択用）
   *
   * 既に選択されたプレイヤーとのペア関係、対戦関係、出場回数などを考慮して
   * 最適なペア候補を評価します。スコアが高いほど選択に適しています。
   *
   * 評価項目：
   * - ペア履歴：同じペアが多いと減点（バリエーション重視）
   * - 対戦履歴：対戦が多いと減点（新しい対戦相手を優遇）
   * - 出場回数：少ないプレイヤーを優遇（公平性維持）
   * - プレイヤー番号：タイブレーカー
   * - 連続パートナー：直前ラウンドと同じペアを避ける
   * - 連続対戦：直前ラウンドと同じ対戦相手を避ける
   *
   * @param {Object} history - { partner: 2D配列, match: 2D配列 } ペア・対戦履歴
   * @param {Array<number>} playCount - 各プレイヤーの出場回数
   * @param {number} leadPlayer - リード選手のインデックス（対象選手を決める際の基準）
   * @param {number} candidate - 候補選手のインデックス
   * @param {number} consecutivePartners - 直前ラウンドでの同パートナー数（デフォルト:0）
   * @param {number} consecutiveMatches - 直前ラウンドでの同対戦相手数（デフォルト:0）
   * @returns {number} 評価スコア（高いほど良い）
   */
  static calculatePairCandidateScore(
    history,
    playCount,
    leadPlayer,
    candidate,
    consecutivePartners = 0,
    consecutiveMatches = 0
  ) {
    const partnerScore =
      -history.partner[leadPlayer][candidate] * SCORING_WEIGHTS.PARTNER_HISTORY;
    const matchScore =
      -history.match[leadPlayer][candidate] *
      SCORING_WEIGHTS.MATCH_HISTORY_SELECT;
    const playScore = -playCount[candidate] * SCORING_WEIGHTS.PLAY_COUNT_SELECT;
    const playerNumberScore = -candidate * SCORING_WEIGHTS.PLAYER_NUMBER;
    const consecutivePartnerScore =
      -consecutivePartners * SCORING_WEIGHTS.CONSECUTIVE_PARTNER_OPPONENT;
    const consecutiveMatchScore =
      -consecutiveMatches * SCORING_WEIGHTS.CONSECUTIVE_MATCH_OPPONENT;
    return (
      partnerScore +
      matchScore +
      playScore +
      playerNumberScore +
      consecutivePartnerScore +
      consecutiveMatchScore
    );
  }

  /**
   * 対戦リード候補のスコアを計算（ポジション3選択用）
   *
   * ポジション1/2で選択されたプレイヤーたちとの対戦相手を評価します。
   * 出場回数が少ないプレイヤーや、対戦経験が少ないプレイヤーを優遇します。
   *
   * 評価項目：
   * - 対戦履歴：リード選手との対戦履歴を考慮
   * - 出場回数：少ないプレイヤーを優遇（公平性維持）
   * - プレイヤー番号：タイブレーカー
   * - 連続対戦：直前ラウンドと同じ対戦相手を避ける
   *
   * @param {Object} history - { partner: 2D配列, match: 2D配列 } ペア・対戦履歴
   * @param {Array<number>} playCount - 各プレイヤーの出場回数
   * @param {number} leadPlayer - リード選手のインデックス（ポジション1）
   * @param {number} candidate - 候補選手のインデックス
   * @param {number} consecutiveMatches - 直前ラウンドでの同対戦相手数（デフォルト:0）
   * @returns {number} 評価スコア（高いほど良い）
   */
  static calculateOpponentLeadScore(
    history,
    playCount,
    leadPlayer,
    candidate,
    consecutiveMatches = 0
  ) {
    const matchScore =
      -history.match[leadPlayer][candidate] *
      SCORING_WEIGHTS.MATCH_HISTORY_SELECT;
    const partnerScore =
      -history.partner[leadPlayer][candidate] * SCORING_WEIGHTS.PARTNER_HISTORY;
    const playScore = -playCount[candidate] * SCORING_WEIGHTS.PLAY_COUNT_SELECT;
    const playerNumberScore = -candidate * SCORING_WEIGHTS.PLAYER_NUMBER;
    const consecutiveScore =
      -consecutiveMatches * SCORING_WEIGHTS.CONSECUTIVE_MATCH_OPPONENT;
    return (
      matchScore +
      partnerScore +
      playScore +
      playerNumberScore +
      consecutiveScore
    );
  }

  /**
   * パターンスコアを計算（全4ポジションが決定した試合の総合評価）
   *
   * 4人のプレイヤーが決まった時点で、その試合全体の質をスコア化します。
   * ペア内・対戦相手間の関係を総合的に評価します。
   *
   * @param {Object} history - { partner: 2D配列, match: 2D配列 } ペア・対戦履歴
   * @param {number} t1p1 - Team1 ポジション1（主役）のインデックス
   * @param {number} t1p2 - Team1 ポジション2（ペア）のインデックス
   * @param {number} t2p1 - Team2 ポジション3（対戦主役）のインデックス
   * @param {number} t2p2 - Team2 ポジション4（対戦ペア）のインデックス
   * @returns {number} パターンスコア
   */
  calculatePatternScore(history, t1p1, t1p2, t2p1, t2p2) {
    const partnerScore =
      -(history.partner[t1p1][t1p2] + history.partner[t2p1][t2p2]) *
      SCORING_WEIGHTS.PARTNER_HISTORY;

    const matchScore =
      -(
        history.match[t1p1][t2p1] +
        history.match[t1p1][t2p2] +
        history.match[t1p2][t2p1] +
        history.match[t1p2][t2p2]
      ) * SCORING_WEIGHTS.MATCH_HISTORY_PATTERN;

    return partnerScore + matchScore;
  }

  /**
   * ミックス形式のボーナスを計算
   *
   * 「男女混合重視型」マッチタイプが選択されている場合、男女が異なるペアを
   * 優遇するためのボーナス値を計算します。
   *
   * @param {Array<string>} genders - 各プレイヤーの性別（'M' or 'F'）
   * @param {number} t1p1 - Team1 ポジション1のインデックス
   * @param {number} t1p2 - Team1 ポジション2のインデックス
   * @param {number} t2p1 - Team2 ポジション3のインデックス
   * @param {number} t2p2 - Team2 ポジション4のインデックス
   * @returns {number} ミックスボーナス値（男女異なるペアがあるほど高い）
   */
  static calculateMixedBonus(genders, t1p1, t1p2, t2p1, t2p2) {
    if (!genders) return 0;

    let bonus = 0;
    // チーム1が男女ペアの場合
    if (genders[t1p1] !== genders[t1p2]) {
      bonus += SCORING_WEIGHTS.MIXED_BONUS;
    }
    // チーム2が男女ペアの場合
    if (genders[t2p1] !== genders[t2p2]) {
      bonus += SCORING_WEIGHTS.MIXED_BONUS;
    }
    return bonus;
  }
}

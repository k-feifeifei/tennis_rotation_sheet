/**
 * テニスローテーション表ジェネレーター - ローテーション生成クラス
 *
 * 複数コートのテニスダブルス試合のローテーション表を自動生成します。
 * ポジション1～4の4層選択方式を採用し、すべての候補プレイヤーを評価してから決定します。
 */

class RotationGenerator {
  /**
   * コンストラクタ
   * @param {string[]} players - プレイヤー名配列
   * @param {number} courtCount - コート数
   * @param {string} matchType - 試合形式（'doubles'固定）
   * @param {number} roundCount - ラウンド数（デフォルト: 10）
   * @param {string} matchSubType - 対戦方式（'balanced' | 'mixed'、デフォルト: 'balanced'）
   * @param {string[]|null} genders - 性別配列（オプション）
   * @param {string} matchFormat - 試合形式詳細（'doubles' | 'doubles-mixed'、デフォルト: 'doubles'）
   */
  constructor(
    players,
    courtCount,
    matchType,
    roundCount = 10,
    matchSubType = "balanced",
    genders = null,
    matchFormat = "doubles",
    excludeSettingsMap = {},
  ) {
    this.players = players;
    this.courtCount = parseInt(courtCount);
    this.matchType = matchType;
    this.roundCount = parseInt(roundCount);
    this.matchSubType = matchSubType;
    this.genders = genders;
    this.matchFormat = matchFormat;
    this.rounds = [];
    this.debugLogs = [];
    this.excludedPlayers = new Set(); // 除外プレイヤーのインデックスを管理
    this.excludeSettingsMap = excludeSettingsMap; // 除外設定: {playerIndex: startRound}
    this.lastRoundMatches = [];
    this.lastRoundPartners = new Set();
    this.lastRoundOpponents = new Set();

    // 対戦方式に応じた重み設定を適用
    this.applyWeightsPreset(matchSubType);

    // 統計情報を初期化
    this.initializeStatistics();

    // ローテーション生成開始
    this.generateRotation();
  }

  /**
   * 対戦方式に応じた重み設定を適用
   * @param {string} matchSubType - 対戦方式
   */
  applyWeightsPreset(matchSubType) {
    const preset =
      SCORING_WEIGHTS_PRESETS[matchSubType] || SCORING_WEIGHTS_PRESETS.balanced;
    Object.keys(preset).forEach((key) => {
      SCORING_WEIGHTS[key] = preset[key];
    });
    this.addLog(`対戦方式: ${this.getMatchSubTypeLabel(matchSubType)}`);
  }

  /**
   * 対戦方式のラベルを取得
   * @param {string} matchSubType - 対戦方式
   * @returns {string} 対戦方式のラベル
   */
  getMatchSubTypeLabel(matchSubType) {
    const labels = {
      balanced: "バランス型（推奨）",
      mixed: "男女混合重視型",
    };
    return labels[matchSubType] || "バランス型（推奨）";
  }

  /**
   * デバッグログを追加
   * @param {string} message - ログメッセージ
   */
  addLog(message) {
    this.debugLogs.push(message);
  }

  /**
   * 統計情報の初期化
   *
   * ローテーション生成過程で、各プレイヤーの出場状況を追跡するために必要な統計情報を初期化します。
   */
  initializeStatistics() {
    const playerCount = this.players.length;

    // 出場回数（全ラウンド通算）
    this.playCount = Array(playerCount).fill(0);

    // 連続待機ラウンド数（同じプレイヤーが連続して待機した回数）
    this.consecutiveRestCount = Array(playerCount).fill(0);

    // 対戦履歴（i vs j の対戦回数を記録）
    this.matchHistory = Array(playerCount)
      .fill(null)
      .map(() => Array(playerCount).fill(0));

    // ペア履歴（i と j がペアを組んだ回数を記録）
    this.partnerHistory = Array(playerCount)
      .fill(null)
      .map(() => Array(playerCount).fill(0));
  }

  /**
   * ローテーション生成のメインロジック
   */
  generateRotation() {
    const playerCount = this.players.length;
    if (playerCount < MIN_PLAYERS.DOUBLES) {
      throw new Error(`ダブルスには最低${MIN_PLAYERS.DOUBLES}人必要です`);
    }
    this.generateDoublesRotation(playerCount, this.roundCount);
  }

  /**
   * ダブルスローテーション生成（改修版：1コートずつ生成）
   */
  generateDoublesRotation(playerCount, maxRounds) {
    for (let round = 0; round < maxRounds; round++) {
      const currentRound = round + 1; // 1-based round number
      this.setLastRoundRelations(this.lastRoundMatches);
      this.addLog(`\n========== 第${currentRound}ラウンド ==========`);
      const usedInRound = new Set();
      const roundMatches = [];

      // 複数コートの場合は1コートずつ生成
      for (let court = 0; court < this.courtCount; court++) {
        const match = this.generateSingleCourtMatch(
          playerCount,
          usedInRound,
          court,
          currentRound,
        );
        if (match) {
          roundMatches.push(match);
        }
      }

      if (roundMatches.length > 0) {
        this.updateStatistics(roundMatches);
        const roundGroup = this.createRoundGroup(roundMatches);
        this.rounds.push(roundGroup);
      }

      // ラウンド後、待機ラウンド数を更新
      for (let i = 0; i < playerCount; i++) {
        if (!usedInRound.has(i)) {
          // このプレイヤーは待機中
          this.consecutiveRestCount[i]++;
        } else {
          // このプレイヤーは出場、待機カウントをリセット
          this.consecutiveRestCount[i] = 0;
        }
      }

      this.lastRoundMatches = roundMatches;
    }
  }

  /**
   * 統計情報を更新
   */
  /**
   * 試合統計情報の更新
   *
   * 各ラウンドで決定した試合情報に基づいて、プレイヤーの出場回数、
   * ポジション別選択回数、ペア関係、対戦関係などを更新します。
   *
   * @param {Array} matches - 試合情報の配列
   *   - t1p1: Team1 ポジション1プレイヤーのインデックス
   *   - t1p2: Team1 ポジション2プレイヤーのインデックス
   *   - t2p1: Team2 ポジション3プレイヤーのインデックス
   *   - t2p2: Team2 ポジション4プレイヤーのインデックス
   */
  updateStatistics(matches) {
    matches.forEach((match) => {
      // 出場回数を更新（4人全員が出場したため各1回ずつ増加）
      [match.t1p1, match.t1p2, match.t2p1, match.t2p2].forEach(
        (p) => this.playCount[p]++,
      );

      // ペア履歴を更新（相互記録：i-j と j-i の両方を更新）
      this.partnerHistory[match.t1p1][match.t1p2]++;
      this.partnerHistory[match.t1p2][match.t1p1]++;
      this.partnerHistory[match.t2p1][match.t2p2]++;
      this.partnerHistory[match.t2p2][match.t2p1]++;

      // 対戦履歴を更新（Team1 vs Team2 の全組み合わせを記録）
      const team1 = [match.t1p1, match.t1p2];
      const team2 = [match.t2p1, match.t2p2];
      team1.forEach((p1) => {
        team2.forEach((p2) => {
          this.matchHistory[p1][p2]++;
          this.matchHistory[p2][p1]++;
        });
      });
    });
  }

  /**
   * ラウンドグループを作成（表示用データ構造）
   */
  createRoundGroup(roundMatches) {
    return roundMatches.map((m) => ({
      team1: [this.players[m.t1p1], this.players[m.t1p2]],
      team2: [this.players[m.t2p1], this.players[m.t2p2]],
      type: "doubles",
      stats: {
        player1: this.createPlayerStats(m.t1p1, m.t1p2, [m.t2p1, m.t2p2]),
        player2: this.createPlayerStats(m.t1p2, m.t1p1, [m.t2p1, m.t2p2]),
        player3: this.createPlayerStats(m.t2p1, m.t2p2, [m.t1p1, m.t1p2]),
        player4: this.createPlayerStats(m.t2p2, m.t2p1, [m.t1p1, m.t1p2]),
      },
    }));
  }

  /**
   * プレイヤー統計データを作成
   */
  createPlayerStats(playerId, partnerId, opponents) {
    const playerNumber = playerId + 1;
    const playerName = this.players[playerId];
    const gender =
      this.genders && this.genders[playerId] ? this.genders[playerId] : "M";

    // プレイヤー名に番号と性別情報を付与
    // 名前が空の場合は番号のみ
    const formattedName = playerName
      ? `${playerNumber}. ${playerName}|${gender}`
      : `${playerNumber}|${gender}`;

    console.log(
      `createPlayerStats: ID=${playerId}, Name=${playerName}, Gender=${gender}, PlayCount=${this.playCount[playerId]}`,
    );

    return {
      name: formattedName,
      playCount: this.playCount[playerId],
      partnerCount: this.partnerHistory[playerId][partnerId],
      matchCount1: this.matchHistory[playerId][opponents[0]],
      matchCount2: this.matchHistory[playerId][opponents[1]],
    };
  }

  /**
   * 連続対戦回数を取得
   */
  getConsecutiveMatches(player1, player2) {
    return this.matchHistory[player1][player2];
  }

  /**
   * 連続队友回数を取得
   */
  getConsecutivePartners(player1, player2) {
    return this.partnerHistory[player1][player2];
  }

  getPairKey(player1, player2) {
    return player1 < player2
      ? `${player1}-${player2}`
      : `${player2}-${player1}`;
  }

  buildRoundRelationSets(matches) {
    const partners = new Set();
    const opponents = new Set();

    matches.forEach((match) => {
      const team1 = [match.t1p1, match.t1p2];
      const team2 = [match.t2p1, match.t2p2];

      partners.add(this.getPairKey(team1[0], team1[1]));
      partners.add(this.getPairKey(team2[0], team2[1]));

      team1.forEach((p1) => {
        team2.forEach((p2) => {
          opponents.add(this.getPairKey(p1, p2));
        });
      });
    });

    return { partners, opponents };
  }

  setLastRoundRelations(matches) {
    const { partners, opponents } = this.buildRoundRelationSets(matches || []);
    this.lastRoundPartners = partners;
    this.lastRoundOpponents = opponents;
  }

  wasConsecutivePartner(player1, player2) {
    if (!this.lastRoundPartners) return false;
    return this.lastRoundPartners.has(this.getPairKey(player1, player2));
  }

  wasConsecutiveOpponent(player1, player2) {
    if (!this.lastRoundOpponents) return false;
    return this.lastRoundOpponents.has(this.getPairKey(player1, player2));
  }

  /**
   * 単一コートのマッチを生成（改修版：シンプルな1コート生成）
   * 手順：
   * 1. 主役プレイヤーを選択
   * 2. 主役プレイヤーのペアプレイヤーを選択
   * 3. 対戦主役プレイヤーを選択
   * 4. 対戦主役プレイヤーのペアプレイヤーを選択
   */
  /**
   * 1コートの試合を生成
   *
   * 1ラウンド内で1コートの試合を生成します。
   * 4人のプレイヤーを4つのポジションに順序立てて割り当てます：
   *
   * 1. ポジション1(Position1): Team1のリード選手
   *    評価基準：出場回数が少ない、ポジション1回数が少ない、連続待機が多い
   *
   * 2. ポジション2(Position2): Team1のペア（ポジション1のパートナー）
   *    評価基準：ポジション1との過去ペア回数、対戦履歴、出場回数
   *
   * 3. ポジション3(Position3): Team2のリード選手（対戦相手）
   *    評価基準：ポジション1との対戦履歴、ポジション1/2との過去対戦、出場回数
   *
   * 4. ポジション4(Position4): Team2のペア（ポジション3のパートナー）
   *    評価基準：ポジション1/2/3との関係、出場回数
   *
   * @param {number} playerCount - 参加者総数
   * @param {Set} usedInRound - このラウンドで既に使用されたプレイヤーのSet
   * @param {number} courtIndex - コートのインデックス（0, 1, 2...）
   * @returns {Object|null} 試合オブジェクト または null（生成不可能な場合）
   */
  generateSingleCourtMatch(playerCount, usedInRound, courtIndex, currentRound) {
    const availablePlayers = Array.from({ length: playerCount }, (_, i) => i)
      .filter((i) => {
        if (usedInRound.has(i)) return false;
        // ラウンド別の除外設定を確認
        if (
          this.excludeSettingsMap[i] &&
          typeof this.excludeSettingsMap[i] === "number" &&
          currentRound >= this.excludeSettingsMap[i]
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => this.playCount[a] - this.playCount[b]);

    // 必要なプレイヤー数チェック（4人必要）
    if (availablePlayers.length < 4) {
      return null;
    }

    this.addLog(`\n--- コート${courtIndex + 1} ---`);

    // 1. ポジション1プレイヤー(lead1)を選択
    const lead1 = this.selectPosition1Player(availablePlayers, usedInRound);
    if (lead1 === null) {
      return null;
    }
    usedInRound.add(lead1);
    this.addLog(`ポジション1: ${this.players[lead1]}`);

    // 2. ポジション2プレイヤー(partner1)を選択
    const partner1 = this.selectPosition2Player(
      lead1,
      availablePlayers,
      usedInRound,
    );
    if (partner1 === null) {
      usedInRound.delete(lead1);
      return null;
    }
    usedInRound.add(partner1);
    this.addLog(
      `ポジション2: ${this.players[lead1]} & ${this.players[partner1]}`,
    );

    // 3. ポジション3プレイヤー(lead2)を選択
    const lead2 = this.selectPosition3Player(
      lead1,
      partner1,
      availablePlayers,
      usedInRound,
    );
    if (lead2 === null) {
      usedInRound.delete(lead1);
      usedInRound.delete(partner1);
      return null;
    }
    usedInRound.add(lead2);
    this.addLog(`ポジション3: ${this.players[lead2]}`);

    // 4. ポジション4プレイヤー(partner2)を選択
    const partner2 = this.selectPosition4Player(
      lead1,
      partner1,
      lead2,
      availablePlayers,
      usedInRound,
    );
    if (partner2 === null) {
      usedInRound.delete(lead1);
      usedInRound.delete(partner1);
      usedInRound.delete(lead2);
      return null;
    }
    usedInRound.add(partner2);
    this.addLog(
      `ポジション4: ${this.players[lead2]} & ${this.players[partner2]}`,
    );

    // マッチを作成
    return {
      t1p1: lead1,
      t1p2: partner1,
      t2p1: lead2,
      t2p2: partner2,
      leadPlayer1: lead1,
      leadPlayer2: lead2,
    };
  }

  /**
   * ポジション1プレイヤーを選択
   * 評価基準：出場回数、ポジション1回数、プレイヤー番号、連続待機回数
   */
  /**
   * ポジション1プレイヤーを選択（Team1 リード選手）
   *
   * このコート・ラウンドのメインプレイヤーを選択します。
   * 出場回数が少ないプレイヤーを優遇し、公平なローテーションを実現します。
   * また、長期間待機していたプレイヤーを優先的に起用します。
   *
   * 評価基準：
   * - 出場回数：少ないほど高評価（公平性維持）
   * - ポジション1回数：主役を務めた回数（バランス調整）
   * - 連続待機ラウンド数：多いほど高評価（長く待機したプレイヤーを優先）
   * - プレイヤー番号：タイブレーカー（同点時は早番を優先）
   *
   * @param {Array<number>} availablePlayers - 利用可能なプレイヤーのインデックス配列
   * @param {Set} usedInRound - このラウンドで既に使用されたプレイヤーのSet
   * @returns {number|null} 選択されたプレイヤーのインデックス、または null（選択不可）
   */
  selectPosition1Player(availablePlayers, usedInRound) {
    const candidates = availablePlayers
      .filter((p) => !usedInRound.has(p))
      .map((player) => {
        const playCountScore =
          this.playCount[player] * SCORING_WEIGHTS.POS1_PLAY_COUNT;
        const consecutiveRestScore =
          this.consecutiveRestCount[player] *
          SCORING_WEIGHTS.POS1_CONSECUTIVE_REST;
        const playerNumberScore = player * SCORING_WEIGHTS.POS1_PLAYER_NUMBER;
        const score = playCountScore + consecutiveRestScore + playerNumberScore;
        return {
          player,
          score,
          playCountScore,
          consecutiveRestScore,
          playerNumberScore,
        };
      });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);

    // デバッグログ：候補者のスコア詳細
    this.addLog(`【ポジション1 評価結果】`);
    candidates.forEach((c) => {
      const playerNum = c.player.toString().padStart(2, "0");
      const playerName = this.players[c.player].padEnd(10, " ");
      this.addLog(
        `  [#${playerNum}] ${playerName} スコア: ${c.score.toFixed(2)} ` +
          `(出場:${c.playCountScore.toFixed(
            2,
          )} 待機:${c.consecutiveRestScore.toFixed(
            2,
          )} ID:${c.playerNumberScore.toFixed(2)})`,
      );
    });

    return candidates[0].player;
  }

  /**
   * ポジション2プレイヤーを選択（Team1 ペア選手）
   *
   * ポジション1（リード選手）のパートナーを選択します。
   * ポジション1との過去ペア関係や対戦経験を考慮し、新しい組み合わせを優遇します。
   *
   * 評価基準：
   * - ポジション1とのペア履歴：多いと減点（新しい組み合わせを優遇）
   * - ポジション1との対戦履歴：多いと減点
   * - 出場回数：少ないほど高評価
   * - ポジション2回数：ペア役を務めた回数のバランス
   * - 連続待機ラウンド数：多いほど優遇
   * - プレイヤー番号：タイブレーカー
   *
   * @param {number} pos1Player - ポジション1プレイヤーのインデックス
   * @param {Array<number>} availablePlayers - 利用可能なプレイヤーのインデックス配列
   * @param {Set} usedInRound - このラウンドで既に使用されたプレイヤーのSet
   * @returns {number|null} 選択されたプレイヤーのインデックス、または null（選択不可）
   */
  selectPosition2Player(pos1Player, availablePlayers, usedInRound) {
    const candidates = availablePlayers
      .filter((p) => !usedInRound.has(p) && p !== pos1Player)
      .map((player) => {
        const partnerCount = this.partnerHistory[pos1Player][player];
        const matchCount = this.matchHistory[pos1Player][player];
        const partnerHistoryScore =
          partnerCount * SCORING_WEIGHTS.POS2_PARTNER_HISTORY;
        const matchHistoryScore =
          matchCount * SCORING_WEIGHTS.POS2_MATCH_HISTORY;
        const playCountScore =
          this.playCount[player] * SCORING_WEIGHTS.POS2_PLAY_COUNT;
        const consecutiveRestScore =
          this.consecutiveRestCount[player] *
          SCORING_WEIGHTS.POS2_CONSECUTIVE_REST;
        const playerNumberScore = player * SCORING_WEIGHTS.POS2_PLAYER_NUMBER;
        const consecutivePartnerPenalty = this.wasConsecutivePartner(
          pos1Player,
          player,
        )
          ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
          : 0;
        const consecutiveOpponentPenalty = this.wasConsecutiveOpponent(
          pos1Player,
          player,
        )
          ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
          : 0;

        // 男女混合ペアのボーナスを計算（ダブルス(ミックス優先)の場合のみ）
        let mixedBonusScore = 0;
        if (
          this.matchFormat === "doubles-mixed" &&
          this.genders &&
          this.genders[pos1Player] &&
          this.genders[player]
        ) {
          const isMixedPair = this.genders[pos1Player] !== this.genders[player];
          if (isMixedPair) {
            mixedBonusScore = SCORING_WEIGHTS.MIXED_BONUS;
          }
        }

        const score =
          partnerHistoryScore +
          matchHistoryScore +
          playCountScore +
          consecutiveRestScore +
          playerNumberScore +
          mixedBonusScore +
          consecutivePartnerPenalty +
          consecutiveOpponentPenalty;
        return {
          player,
          score,
          partnerHistoryScore,
          matchHistoryScore,
          playCountScore,
          consecutiveRestScore,
          playerNumberScore,
          mixedBonusScore,
          consecutivePartnerPenalty,
          consecutiveOpponentPenalty,
        };
      });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);

    // デバッグログ：候補者のスコア詳細
    this.addLog(`【ポジション2 評価結果】`);
    candidates.forEach((c) => {
      const playerNum = c.player.toString().padStart(2, "0");
      const playerName = this.players[c.player].padEnd(10, " ");
      this.addLog(
        `  [#${playerNum}] ${playerName} スコア: ${c.score.toFixed(2)} ` +
          `(ペア:${c.partnerHistoryScore.toFixed(
            2,
          )} 対戦:${c.matchHistoryScore.toFixed(
            2,
          )} 出場:${c.playCountScore.toFixed(
            2,
          )} 待機:${c.consecutiveRestScore.toFixed(2)})`,
      );
    });

    return candidates[0].player;
  }

  /**
   * ポジション3プレイヤーを選択（Team2 リード選手 - 対戦相手）
   *
   * ポジション1/2で選択されたTeam1と対戦するTeam2のリード選手を選択します。
   * 新しい対戦パターンを作ることで、対戦のバリエーションを増やします。
   *
   * 評価基準：
   * - ポジション1との過去ペア履歴：多いと減点
   * - ポジション1との過去対戦履歴：多いと減点
   * - ポジション2との過去ペア履歴：多いと減点
   * - ポジション2との過去対戦履歴：多いと減点
   * - 出場回数：少ないほど高評価
   * - ポジション3回数：対戦リード役を務めた回数のバランス
   * - 連続待機ラウンド数：多いほど優遇
   * - プレイヤー番号：タイブレーカー
   *
   * @param {number} pos1Player - ポジション1プレイヤーのインデックス
   * @param {number} pos2Player - ポジション2プレイヤーのインデックス
   * @param {Array<number>} availablePlayers - 利用可能なプレイヤーのインデックス配列
   * @param {Set} usedInRound - このラウンドで既に使用されたプレイヤーのSet
   * @returns {number|null} 選択されたプレイヤーのインデックス、または null（選択不可）
   */
  selectPosition3Player(pos1Player, pos2Player, availablePlayers, usedInRound) {
    const candidates = availablePlayers
      .filter(
        (p) => !usedInRound.has(p) && p !== pos1Player && p !== pos2Player,
      )
      .map((player) => {
        const pos1PartnerCount = this.partnerHistory[pos1Player][player];
        const pos1MatchCount = this.matchHistory[pos1Player][player];
        const pos2PartnerCount = this.partnerHistory[pos2Player][player];
        const pos2MatchCount = this.matchHistory[pos2Player][player];

        const pos1PartnerHistoryScore =
          pos1PartnerCount * SCORING_WEIGHTS.POS3_PARTNER_HISTORY;
        const pos1MatchHistoryScore =
          pos1MatchCount * SCORING_WEIGHTS.POS3_MATCH_HISTORY;
        const pos2PartnerHistoryScore =
          pos2PartnerCount * SCORING_WEIGHTS.POS3_PARTNER_HISTORY;
        const pos2MatchHistoryScore =
          pos2MatchCount * SCORING_WEIGHTS.POS3_MATCH_HISTORY;
        const playCountScore =
          this.playCount[player] * SCORING_WEIGHTS.POS3_PLAY_COUNT;
        const consecutiveRestScore =
          this.consecutiveRestCount[player] *
          SCORING_WEIGHTS.POS3_CONSECUTIVE_REST;
        const playerNumberScore = player * SCORING_WEIGHTS.POS3_PLAYER_NUMBER;
        const consecutivePartnerPenalty =
          (this.wasConsecutivePartner(pos1Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
            : 0) +
          (this.wasConsecutivePartner(pos2Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
            : 0);
        const consecutiveOpponentPenalty =
          (this.wasConsecutiveOpponent(pos1Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
            : 0) +
          (this.wasConsecutiveOpponent(pos2Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
            : 0);
        const score =
          pos1PartnerHistoryScore +
          pos1MatchHistoryScore +
          pos2PartnerHistoryScore +
          pos2MatchHistoryScore +
          playCountScore +
          consecutiveRestScore +
          playerNumberScore +
          consecutivePartnerPenalty +
          consecutiveOpponentPenalty;
        return {
          player,
          score,
          pos1PartnerHistoryScore,
          pos1MatchHistoryScore,
          pos2PartnerHistoryScore,
          pos2MatchHistoryScore,
          playCountScore,
          consecutiveRestScore,
          playerNumberScore,
          consecutivePartnerPenalty,
          consecutiveOpponentPenalty,
        };
      });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);

    // デバッグログ：候補者のスコア詳細
    this.addLog(`【ポジション3 評価結果】`);
    candidates.forEach((c) => {
      const playerNum = c.player.toString().padStart(2, "0");
      const playerName = this.players[c.player].padEnd(10, " ");
      this.addLog(
        `  [#${playerNum}] ${playerName} スコア: ${c.score.toFixed(2)} ` +
          `(P1ペア:${c.pos1PartnerHistoryScore.toFixed(
            2,
          )} P1対:${c.pos1MatchHistoryScore.toFixed(
            2,
          )} P2ペア:${c.pos2PartnerHistoryScore.toFixed(
            2,
          )} P2対:${c.pos2MatchHistoryScore.toFixed(
            2,
          )} 出場:${c.playCountScore.toFixed(
            2,
          )} 待機:${c.consecutiveRestScore.toFixed(2)})`,
      );
    });

    return candidates[0].player;
  }

  /**
   * ポジション4プレイヤーを選択（Team2 ペア選手 - 対戦相手のペア）
   *
   * ポジション3（Team2リード）のパートナーを選択します。
   * ポジション1/2/3との全ての関係を考慮し、最も新しい組み合わせを優遇します。
   * これが4人目の選択であり、試合が確定するタイミングです。
   *
   * 評価基準：
   * - ポジション1/2/3各者との過去ペア履歴：多いと減点
   * - ポジション1/2/3各者との過去対戦履歴：多いと減点
   * - 出場回数：少ないほど高評価
   * - ポジション4回数：ペア役を務めた回数のバランス
   * - 連続待機ラウンド数：多いほど優遇
   * - プレイヤー番号：タイブレーカー
   *
   * @param {number} pos1Player - ポジション1プレイヤーのインデックス
   * @param {number} pos2Player - ポジション2プレイヤーのインデックス
   * @param {number} pos3Player - ポジション3プレイヤーのインデックス
   * @param {Array<number>} availablePlayers - 利用可能なプレイヤーのインデックス配列
   * @param {Set} usedInRound - このラウンドで既に使用されたプレイヤーのSet
   * @returns {number|null} 選択されたプレイヤーのインデックス、または null（選択不可）
   */
  selectPosition4Player(
    pos1Player,
    pos2Player,
    pos3Player,
    availablePlayers,
    usedInRound,
  ) {
    const candidates = availablePlayers
      .filter(
        (p) =>
          !usedInRound.has(p) &&
          p !== pos1Player &&
          p !== pos2Player &&
          p !== pos3Player,
      )
      .map((player) => {
        const pos1PartnerCount = this.partnerHistory[pos1Player][player];
        const pos1MatchCount = this.matchHistory[pos1Player][player];
        const pos2PartnerCount = this.partnerHistory[pos2Player][player];
        const pos2MatchCount = this.matchHistory[pos2Player][player];
        const pos3PartnerCount = this.partnerHistory[pos3Player][player];
        const pos3MatchCount = this.matchHistory[pos3Player][player];

        const pos1PartnerHistoryScore =
          pos1PartnerCount * SCORING_WEIGHTS.POS4_PARTNER_HISTORY;
        const pos1MatchHistoryScore =
          pos1MatchCount * SCORING_WEIGHTS.POS4_MATCH_HISTORY;
        const pos2PartnerHistoryScore =
          pos2PartnerCount * SCORING_WEIGHTS.POS4_PARTNER_HISTORY;
        const pos2MatchHistoryScore =
          pos2MatchCount * SCORING_WEIGHTS.POS4_MATCH_HISTORY;
        const pos3PartnerHistoryScore =
          pos3PartnerCount * SCORING_WEIGHTS.POS4_PARTNER_HISTORY;
        const pos3MatchHistoryScore =
          pos3MatchCount * SCORING_WEIGHTS.POS4_MATCH_HISTORY;
        const playCountScore =
          this.playCount[player] * SCORING_WEIGHTS.POS4_PLAY_COUNT;
        const consecutiveRestScore =
          this.consecutiveRestCount[player] *
          SCORING_WEIGHTS.POS4_CONSECUTIVE_REST;
        const playerNumberScore = player * SCORING_WEIGHTS.POS4_PLAYER_NUMBER;
        const consecutivePartnerPenalty =
          (this.wasConsecutivePartner(pos3Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
            : 0) +
          (this.wasConsecutivePartner(pos1Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
            : 0) +
          (this.wasConsecutivePartner(pos2Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_PARTNER_PENALTY
            : 0);
        const consecutiveOpponentPenalty =
          (this.wasConsecutiveOpponent(pos1Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
            : 0) +
          (this.wasConsecutiveOpponent(pos2Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
            : 0) +
          (this.wasConsecutiveOpponent(pos3Player, player)
            ? SCORING_WEIGHTS.CONSECUTIVE_OPPONENT_PENALTY
            : 0);

        // 男女混合ペアのボーナスを計算（ポジション3とのペア）
        let mixedBonusScore = 0;
        if (
          this.matchFormat === "doubles-mixed" &&
          this.genders &&
          this.genders[pos3Player] &&
          this.genders[player]
        ) {
          const isMixedPair = this.genders[pos3Player] !== this.genders[player];
          if (isMixedPair) {
            mixedBonusScore = SCORING_WEIGHTS.MIXED_BONUS;
          }
        }

        const score =
          pos1PartnerHistoryScore +
          pos1MatchHistoryScore +
          pos2PartnerHistoryScore +
          pos2MatchHistoryScore +
          pos3PartnerHistoryScore +
          pos3MatchHistoryScore +
          playCountScore +
          consecutiveRestScore +
          playerNumberScore +
          mixedBonusScore +
          consecutivePartnerPenalty +
          consecutiveOpponentPenalty;
        return {
          player,
          score,
          pos1PartnerHistoryScore,
          pos1MatchHistoryScore,
          pos2PartnerHistoryScore,
          pos2MatchHistoryScore,
          pos3PartnerHistoryScore,
          pos3MatchHistoryScore,
          playCountScore,
          consecutiveRestScore,
          playerNumberScore,
          mixedBonusScore,
          consecutivePartnerPenalty,
          consecutiveOpponentPenalty,
        };
      });

    if (candidates.length === 0) {
      return null;
    }

    candidates.sort((a, b) => b.score - a.score);

    // デバッグログ：候補者のスコア詳細
    this.addLog(`【ポジション4 評価結果】`);
    candidates.forEach((c) => {
      const playerNum = c.player.toString().padStart(2, "0");
      const playerName = this.players[c.player].padEnd(10, " ");
      this.addLog(
        `  [#${playerNum}] ${playerName} スコア: ${c.score.toFixed(2)} ` +
          `(P1:${(c.pos1PartnerHistoryScore + c.pos1MatchHistoryScore).toFixed(
            2,
          )} P2:${(c.pos2PartnerHistoryScore + c.pos2MatchHistoryScore).toFixed(
            2,
          )} P3:${(c.pos3PartnerHistoryScore + c.pos3MatchHistoryScore).toFixed(
            2,
          )} 出場:${c.playCountScore.toFixed(
            2,
          )} 待機:${c.consecutiveRestScore.toFixed(2)})`,
      );
    });

    return candidates[0].player;
  }

  /**
   * 新規プレイヤーを追加して継続生成
   * @param {string} newPlayerName - 新規プレイヤー名
   * @param {number} startRound - 追加開始ラウンド（1-based）
   * @param {number} initialPlayCount - 初期出場回数（既存プレイヤーの平均値で初期化）
   * @param {string|null} newPlayerGender - 新規プレイヤーの性別（M/F、オプション）
   */
  addPlayerAndContinue(
    newPlayerName,
    startRound,
    initialPlayCount,
    newPlayerGender = null,
  ) {
    // 入力検証
    if (typeof newPlayerName !== "string") {
      throw new Error("プレイヤー名が無効です");
    }
    // startRoundはroundCount（予定ラウンド数）まで許可
    // rounds.lengthは現在生成済みのラウンド数なので、初期追加時は0の可能性がある
    const maxRound = Math.max(this.rounds.length, this.roundCount);
    if (
      !Number.isInteger(startRound) ||
      startRound < 1 ||
      startRound > maxRound
    ) {
      throw new Error(
        `開始ラウンドが無効です: ${startRound}（有効範囲: 1-${maxRound}）`,
      );
    }
    if (!Number.isInteger(initialPlayCount) || initialPlayCount < 0) {
      throw new Error(
        `初期出場回数が無効です: ${initialPlayCount}（整数が必要）`,
      );
    }

    // 1. 新規プレイヤーを配列に追加
    const newPlayerIndex = this.players.length;
    this.players.push(newPlayerName);

    // 2. 性別を追加（ミックス対応時のみ）
    if (this.genders) {
      // gendersが存在する場合は必ず追加（デフォルトは"M"）
      this.genders.push(newPlayerGender || "M");
    }

    // 3. 統計情報を拡張（整数に丸める）
    this.playCount.push(Math.floor(initialPlayCount));
    this.consecutiveRestCount.push(0);

    // 4. ペア・対戦履歴を拡張
    const playerCount = this.players.length;

    // 既存プレイヤーの履歴配列に新プレイヤー分の列を追加
    for (let i = 0; i < playerCount - 1; i++) {
      // 配列が存在しない場合は初期化
      if (!this.partnerHistory[i]) {
        this.partnerHistory[i] = Array(playerCount - 1).fill(0);
      }
      if (!this.matchHistory[i]) {
        this.matchHistory[i] = Array(playerCount - 1).fill(0);
      }
      this.partnerHistory[i].push(0);
      this.matchHistory[i].push(0);
    }
    // 新プレイヤーの履歴配列を追加
    this.partnerHistory.push(Array(playerCount).fill(0));
    this.matchHistory.push(Array(playerCount).fill(0));

    // 5. startRound - 1まで既存ラウンドを保持し、startRound以降を再生成
    const preservedRounds = this.rounds.slice(0, startRound - 1);

    // 5.1. 全プレイヤーの統計をpreservedRoundsまでの正確な値に再計算
    // playCountなどをリセット
    for (let i = 0; i < newPlayerIndex; i++) {
      this.playCount[i] = 0;
      this.consecutiveRestCount[i] = 0;
    }
    // 新規プレイヤーの統計は既に初期化済み

    // ペア・対戦履歴をリセット
    for (let i = 0; i < playerCount; i++) {
      // 配列の整合性を確認して必要なら初期化
      if (
        !this.partnerHistory[i] ||
        this.partnerHistory[i].length !== playerCount
      ) {
        this.partnerHistory[i] = Array(playerCount).fill(0);
      }
      if (
        !this.matchHistory[i] ||
        this.matchHistory[i].length !== playerCount
      ) {
        this.matchHistory[i] = Array(playerCount).fill(0);
      }
      // リセット
      for (let j = 0; j < playerCount; j++) {
        this.partnerHistory[i][j] = 0;
        this.matchHistory[i][j] = 0;
      }
    }

    // preservedRoundsの統計を再集計
    for (let roundIdx = 0; roundIdx < preservedRounds.length; roundIdx++) {
      const roundGroup = preservedRounds[roundIdx];
      const playedInRound = new Set();

      // roundGroupは試合の配列
      for (const match of roundGroup) {
        // matchから元の試合データを復元
        // team1: [name1, name2], team2: [name3, name4]
        const p1Name = match.team1[0];
        const p2Name = match.team1[1];
        const p3Name = match.team2[0];
        const p4Name = match.team2[1];

        const p1 = this.players.indexOf(p1Name);
        const p2 = this.players.indexOf(p2Name);
        const p3 = this.players.indexOf(p3Name);
        const p4 = this.players.indexOf(p4Name);

        if (p1 >= 0 && p2 >= 0 && p3 >= 0 && p4 >= 0) {
          // 出場フラグを記録
          playedInRound.add(p1);
          playedInRound.add(p2);
          playedInRound.add(p3);
          playedInRound.add(p4);

          // 出場回数を更新
          this.playCount[p1]++;
          this.playCount[p2]++;
          this.playCount[p3]++;
          this.playCount[p4]++;

          // ペア関係を更新
          this.partnerHistory[p1][p2]++;
          this.partnerHistory[p2][p1]++;
          this.partnerHistory[p3][p4]++;
          this.partnerHistory[p4][p3]++;

          // 対戦関係を更新
          this.matchHistory[p1][p3]++;
          this.matchHistory[p1][p4]++;
          this.matchHistory[p2][p3]++;
          this.matchHistory[p2][p4]++;
          this.matchHistory[p3][p1]++;
          this.matchHistory[p3][p2]++;
          this.matchHistory[p4][p1]++;
          this.matchHistory[p4][p2]++;
        }
      }

      // このラウンドでの待機状況を更新（既存プレイヤーのみ）
      for (let i = 0; i < newPlayerIndex; i++) {
        if (!playedInRound.has(i)) {
          this.consecutiveRestCount[i]++;
        } else {
          this.consecutiveRestCount[i] = 0;
        }
      }
    }

    // 6. startRound以降のラウンドを生成
    this.rounds = preservedRounds;
    const playerCountForGeneration = this.players.length;

    console.log(`=== プレイヤー追加後の状態 ===`);
    console.log(`プレイヤー総数: ${playerCountForGeneration}`);
    console.log(`プレイヤーリスト:`, this.players);
    console.log(`性別リスト:`, this.genders);
    console.log(`出場回数:`, this.playCount);
    console.log(
      `startRound以降を再生成: Round ${startRound} ~ ${this.roundCount}`,
    );

    for (let round = startRound - 1; round < this.roundCount; round++) {
      this.addLog(
        `\n========== 第${round + 1}ラウンド (新規プレイヤーを含む) ==========`,
      );
      const usedInRound = new Set();
      const roundMatches = [];

      for (let court = 0; court < this.courtCount; court++) {
        const match = this.generateSingleCourtMatch(
          playerCountForGeneration,
          usedInRound,
          court,
          round + 1,
        );
        if (match) {
          roundMatches.push(match);
        }
      }

      if (roundMatches.length > 0) {
        this.updateStatistics(roundMatches);
        const roundGroup = this.createRoundGroup(roundMatches);
        console.log(`Round ${round + 1} (新規プレイヤー含む) 生成完了:`, {
          プレイヤー数: playerCountForGeneration,
          試合データ: roundGroup,
        });
        this.rounds.push(roundGroup);
      }

      // ラウンド後、待機ラウンド数を更新
      for (let i = 0; i < playerCountForGeneration; i++) {
        if (!usedInRound.has(i)) {
          this.consecutiveRestCount[i]++;
        } else {
          this.consecutiveRestCount[i] = 0;
        }
      }
    }
  }

  getRounds() {
    return this.rounds;
  }
}

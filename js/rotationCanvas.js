/**
 * テニスダブルスローテーション表 - Canvas描画クラス
 *
 * 生成されたローテーション情報をHTML5 Canvasに描画します。
 * 複数コート、複数ラウンドの試合表を表示形式で出力します。
 *
 * 主な機能：
 * - ラウンド別、コート別の試合情報を表形式で描画
 * - プレイヤーの役割（ポジション1～4）と出場統計を表示
 * - PNG形式での画像エクスポート機能
 * - レスポンシブな描画設定で多様なコート構成に対応
 */

class RotationCanvas {
  constructor(rotation, title, matchType) {
    this.rotation = rotation;
    this.title = title;
    this.matchType = matchType;
    this.canvas = document.getElementById("rotationCanvas");
    this.ctx = this.canvas.getContext("2d");

    // 描画設定（ここで一括調整可能）
    this.config = {
      // レイアウトサイズ
      layout: {
        courtWidth: 540, // コート枠の幅
        courtHeight: 80, // コート枠の高さ
        courtLabelHeight: 20, // コート名ラベルの高さ
        courtGap: 15, // コート間の余白
        roundGap: 30, // ラウンド間の余白
        roundHeaderHeight: 55, // ラウンドヘッダーの高さ
        padding: 20, // 全体のパディング
        titleTopMargin: 50, // タイトル上部の余白
        baseTitleHeight: 100, // タイトル部の基本高さ
        legendHeight: 50, // 凡例の高さ
        legendMarginTop: 15, // 凡例上部余白
        legendMarginBottom: 20, // 凡例下部余白
        vsCircleRadius: 18, // VSマークの円の半径
      },

      // フォント設定
      fonts: {
        titleSize: 24,
        titleFont: "bold 24px sans-serif",

        subTitleSize: 14,
        subTitleFont: "14px sans-serif",

        roundHeaderSize: 16,
        roundHeaderFont: "bold 16px sans-serif",

        courtLabelSize: 12,
        courtLabelFont: "bold 12px sans-serif",

        playerNameSize: 16,
        playerNameFont: "bold 16px sans-serif",

        statsSize: 12,
        statsFont: "12px sans-serif",

        statsVerticalSize: 10,
        statsVerticalFont: "10px sans-serif",

        badgeNumberSize: 12,
        badgeNumberFont: "bold 12px sans-serif",

        legendSize: 11,
        legendFont: "11px sans-serif",

        legendTitleFont: "bold 11px sans-serif",
      },

      // 色設定
      colors: {
        // 背景色
        canvasBackground: "#FFFFFF",

        // タイトル
        titleGradientStart: "#7B9FE3",
        titleGradientEnd: "#5A7ACD",
        titleText: "#FFFFFF",
        titleShadow: "rgba(0, 0, 0, 0.2)",

        // ラウンドヘッダー
        roundHeaderBackground: "#FFE5F1",
        roundHeaderBorder: "#FFB6D9",
        roundHeaderText: "#FF69B4",

        // コート枠
        courtBackgrounds: [
          "#FFF0F5",
          "#F0F8FF",
          "#FFF5EE",
          "#F0FFF0",
          "#FFF0FF",
        ],
        courtBorder: "#FFB6D9",
        courtBorderWidth: 4,
        courtDividerDotted: "#FFB6D9",
        courtDividerSolid: "#FFB6D9",
        courtDividerWidth: 2,
        courtLabelText: "#FF69B4",

        // VSマーク
        vsBackground: "#FFE5F1",
        vsBorder: "#FFB6D9",
        vsText: "#FF69B4",

        // プレイヤー名・統計
        playerNameText: "#FF69B4",
        statsText: "#8B4789",

        // バッジ
        badgeBorder: "#FFFFFF",
        badgeBorderWidth: 2,
        badgeText: "#FFFFFF",
        badgeShadow: "rgba(0, 0, 0, 0.3)",

        // 凡例
        legendBackground: "#F8F9FA",
        legendBorder: "#E0E0E0",
        legendText: "#666",
        legendTitleText: "#555",
      },

      // バッジカラーパレット（視認性の良い20色）
      badgeColors: [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E2",
        "#F8B500",
        "#52B788",
        "#E74C3C",
        "#3498DB",
        "#9B59B6",
        "#1ABC9C",
        "#F39C12",
        "#E91E63",
        "#00BCD4",
        "#8BC34A",
        "#FF9800",
        "#607D8B",
      ],

      // その他
      other: {
        badgeSize: 24, // バッジの直径
        badgeSpacing: 12, // バッジ下の余白
        playerNameSpacing: 24, // プレイヤー名下の余白
        statsLineHeight: 13, // 統計情報の行間（縦並び）
        statsEdgeMargin: 5, // 統計情報の端からの余白
        boxShadowBlur: 12, // コート枠の影のぼかし
        boxShadowOffset: 6, // コート枠の影のオフセット
        boxShadowColor: "rgba(255, 182, 217, 0.3)",
      },
    };

    // 後方互換性のため、直接プロパティとしても参照可能にする
    this.courtWidth = this.config.layout.courtWidth;
    this.courtHeight = this.config.layout.courtHeight;
    this.courtLabelHeight = this.config.layout.courtLabelHeight;
    this.courtGap = this.config.layout.courtGap;
    this.roundGap = this.config.layout.roundGap;
    this.padding = this.config.layout.padding;
    this.baseTitleHeight = this.config.layout.baseTitleHeight;
    this.titleHeight = this.baseTitleHeight;
    this.badgeColors = this.config.badgeColors;

    // コート毎の背景色をランダムに生成（全ラウンドで同じコートは同じ色）
    const courtBgColors = [
      "#FFF0F5",
      "#F0F8FF",
      "#FFF5EE",
      "#F0FFF0",
      "#FFF0FF",
      "#FFE4E1",
      "#F0FFFF",
      "#FFF8DC",
      "#F5F5DC",
      "#FFFACD",
    ];

    // Fisher-Yatesアルゴリズムでシャッフル
    const shuffledColors = [...courtBgColors];
    for (let i = shuffledColors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledColors[i], shuffledColors[j]] = [
        shuffledColors[j],
        shuffledColors[i],
      ];
    }

    const courtCount = this.rotation.courtCount;
    this.courtColors = Array(courtCount)
      .fill(null)
      .map((_, index) => shuffledColors[index % shuffledColors.length]);

    this.setupCanvas();
  }

  setupCanvas() {
    const rounds = this.rotation.getRounds();

    // 縦長レイアウト：幅は固定、高さは動的に計算
    this.canvasWidth = this.courtWidth + this.padding * 2;

    // 高さの計算：各ラウンドのコート数に応じて
    let totalHeight =
      this.padding + this.config.layout.titleTopMargin + this.titleHeight;

    // アイコン凡例の高さを追加
    totalHeight += 15 + 50 + 20; // 上余白 + 凡例高さ + 下余白

    rounds.forEach((round) => {
      totalHeight += 55; // ラウンドヘッダー（実際のdrawRotationと一致させる）
      totalHeight += round.length * (this.courtLabelHeight + this.courtHeight); // 各コートの高さ（コート名 + 本体）
      totalHeight += (round.length - 1) * this.courtGap; // コート間の余白
      totalHeight += this.roundGap; // ラウンド後の余白
    });

    totalHeight += this.padding; // 最後のパディング

    this.canvasHeight = totalHeight;

    // 高DPI対応
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = this.canvasWidth + "px";
    this.canvas.style.height = this.canvasHeight + "px";

    this.ctx.scale(dpr, dpr);
  }

  draw() {
    // 背景
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    // タイトル描画
    this.drawTitle();

    // ローテーション描画
    this.drawRotation();
  }

  drawTitle() {
    // タイトルの長さに応じて改行して行数を計算
    const titleText = this.title || "ローテーション表";
    const maxWidth = this.canvasWidth - this.padding * 4;

    // 一時的にフォントを設定してテキスト測定
    this.ctx.font = "bold 24px sans-serif";
    const lines = this.wrapText(titleText, maxWidth, "bold 24px sans-serif");

    const lineHeight = 28;
    const additionalHeight = Math.max(0, (lines.length - 1) * lineHeight);
    this.titleHeight = this.baseTitleHeight + additionalHeight;

    const titleTopMargin = this.config.layout.titleTopMargin;

    // タイトル背景（可愛いパステルグラデーション）
    const gradient = this.ctx.createLinearGradient(
      0,
      this.padding + titleTopMargin,
      0,
      titleTopMargin + this.titleHeight,
    );
    gradient.addColorStop(0, "#7B9FE3");
    gradient.addColorStop(1, "#5A7ACD");

    this.ctx.fillStyle = gradient;
    // 角丸の背景
    this.roundRect(
      this.padding,
      this.padding + titleTopMargin,
      this.canvasWidth - this.padding * 2,
      this.titleHeight - this.padding,
      15,
    );
    this.ctx.fill();

    // タイトルテキスト
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 24px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    // テキストに影をつける
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
    this.ctx.shadowBlur = 3;
    this.ctx.shadowOffsetX = 1;
    this.ctx.shadowOffsetY = 1;

    const startY = this.padding + titleTopMargin + 25;

    lines.forEach((line, index) => {
      this.ctx.fillText(
        line,
        this.canvasWidth / 2,
        startY + index * lineHeight,
      );
    });

    // サブタイトル
    this.ctx.font = "14px sans-serif";
    this.ctx.fillText(
      `ダブルス 対戦表 ✨`,
      this.canvasWidth / 2,
      this.padding + titleTopMargin + 55 + additionalHeight,
    );
    this.ctx.shadowColor = "transparent";
  }

  drawRotation() {
    const rounds = this.rotation.getRounds();
    let currentY =
      this.padding + this.config.layout.titleTopMargin + this.titleHeight;

    rounds.forEach((round, roundIndex) => {
      // 第1ラウンドの前にアイコン凡例を表示
      if (roundIndex === 0) {
        currentY += 15; // 余白
        const legendHeight = this.drawLegend(currentY);
        currentY += legendHeight + 20; // 凡例の高さ + 余白
      }

      // ラウンドヘッダー
      this.drawRoundHeader(currentY, roundIndex + 1);
      currentY += 55; // ヘッダーの高さ分進める（コート名と被らないように余白を確保）

      // 各コートの試合を縦に並べる
      round.forEach((match, courtIndex) => {
        const courtX = this.padding; // 常に左端から
        this.drawMatch(courtX, currentY, match, courtIndex, roundIndex);
        currentY += this.courtLabelHeight + this.courtHeight + this.courtGap; // コート名 + 本体 + 次のコートの位置へ
      });

      // 最後のコートの余白を調整し、ラウンド間の余白を追加
      currentY = currentY - this.courtGap + this.roundGap;
    });
  }

  drawLegend(y) {
    // アイコンの説明を表示
    const legendHeight = 50;
    const legendY = y;

    // 背景
    this.ctx.fillStyle = "#F8F9FA";
    this.roundRect(
      this.padding,
      legendY,
      this.canvasWidth - this.padding * 2,
      legendHeight,
      10,
    );
    this.ctx.fill();

    // 枠線
    this.ctx.strokeStyle = "#E0E0E0";
    this.ctx.lineWidth = 1;
    this.roundRect(
      this.padding,
      legendY,
      this.canvasWidth - this.padding * 2,
      legendHeight,
      10,
    );
    this.ctx.stroke();

    // タイトル
    this.ctx.fillStyle = "#555";
    this.ctx.font = "bold 14px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "top";
    this.ctx.fillText("アイコンの説明", this.canvasWidth / 2, legendY + 8);

    // アイコン説明（横並び）
    this.ctx.font = "15px sans-serif";
    this.ctx.fillStyle = "#666";
    const iconY = legendY + 28;
    const spacing = (this.canvasWidth - this.padding * 2) / 3;

    // 🎾 出場
    this.ctx.textAlign = "center";
    this.ctx.fillText("🎾 出場回数", this.padding + spacing / 2, iconY);

    // 👫 ペア（ダブルスのみ）
    if (this.matchType === "doubles") {
      this.ctx.fillText("👫 ペア回数", this.padding + spacing * 1.5, iconY);
    }

    // ⚔️ 対戦
    this.ctx.fillText("⚔️ 対戦回数", this.padding + spacing * 2.5, iconY);

    return legendHeight;
  }

  drawRoundHeader(y, roundNumber) {
    // 可愛い背景バッジ
    const badgeWidth = 180;
    const badgeHeight = 30;
    const badgeX = (this.canvasWidth - badgeWidth) / 2;

    this.ctx.fillStyle = "#FFE5F1";
    this.roundRect(badgeX, y, badgeWidth, badgeHeight, 15);
    this.ctx.fill();

    this.ctx.strokeStyle = "#FFB6D9";
    this.ctx.lineWidth = 2;
    this.roundRect(badgeX, y, badgeWidth, badgeHeight, 15);
    this.ctx.stroke();

    this.ctx.fillStyle = "#FF69B4";
    this.ctx.font = "bold 16px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(
      `★ 第${roundNumber}ラウンド ★`,
      this.canvasWidth / 2,
      y + badgeHeight / 2,
    );
  }

  drawMatch(x, y, match, courtIndex, roundIndex) {
    // ボックスの柔らかい影（強調）
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.15)";
    this.ctx.shadowBlur = 8;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 4;

    // ボックス背景（コート毎に同じ色）
    this.ctx.fillStyle = this.courtColors[courtIndex];
    this.roundRect(x, y, this.courtWidth, this.courtHeight, 12);
    this.ctx.fill();

    // ボックス枠線（可愛いカラー）
    this.ctx.shadowColor = "transparent";
    this.ctx.strokeStyle = "#FFB6D9";
    this.ctx.lineWidth = 3;
    this.roundRect(x, y, this.courtWidth, this.courtHeight, 12);
    this.ctx.stroke();

    this.drawDoublesMatch(x, y, match, courtIndex);
  }

  drawDoublesMatch(x, y, match, courtIndex) {
    // 4枠レイアウト（1×4グリッド）
    const cellWidth = this.courtWidth / 4;
    const cellHeight = this.courtHeight;

    // 縦の仕切り線
    this.ctx.strokeStyle = "#FFB6D9";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    // 左から1本目の縦線（点線）
    this.ctx.beginPath();
    this.ctx.moveTo(x + cellWidth, y);
    this.ctx.lineTo(x + cellWidth, y + this.courtHeight);
    this.ctx.stroke();

    // 左から2本目の縦線（実線）
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(x + cellWidth * 2, y);
    this.ctx.lineTo(x + cellWidth * 2, y + this.courtHeight);
    this.ctx.stroke();
    this.ctx.setLineDash([5, 5]);

    // 左から3本目の縦線（点線）
    this.ctx.beginPath();
    this.ctx.moveTo(x + cellWidth * 3, y);
    this.ctx.lineTo(x + cellWidth * 3, y + this.courtHeight);
    this.ctx.stroke();

    this.ctx.setLineDash([]);

    // コート名（4枠の外側・上部）
    const courtLabel = String.fromCharCode(65 + courtIndex);
    this.ctx.fillStyle = "#FF69B4";
    this.ctx.font = "bold 12px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "bottom";
    this.ctx.fillText(`コート${courtLabel}`, x + this.courtWidth / 2, y - 5);

    // VS マーク（中央、可愛いスタイル）
    const vsX = x + this.courtWidth / 2;
    const vsY = y + this.courtHeight / 2;

    // 背景の円
    this.ctx.fillStyle = "#FFE5F1";
    this.ctx.beginPath();
    this.ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = "#FFB6D9";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(vsX, vsY, 18, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.fillStyle = "#FF69B4";
    this.ctx.font = "bold 14px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("VS", vsX, vsY);

    // プレイヤー1（左端）
    this.drawPlayerStats(
      x + cellWidth / 2,
      y + 5,
      match.stats.player1.name,
      match.stats.player1.playCount,
      match.stats.player1.partnerCount,
      [match.stats.player1.matchCount1, match.stats.player1.matchCount2],
      cellWidth - 10,
      "left",
      x, // 枚の左端位置
    );

    // プレイヤー2（左から2番目）
    this.drawPlayerStats(
      x + cellWidth + cellWidth / 2,
      y + 5,
      match.stats.player2.name,
      match.stats.player2.playCount,
      match.stats.player2.partnerCount,
      [match.stats.player2.matchCount1, match.stats.player2.matchCount2],
      cellWidth - 10,
      "left",
      x + cellWidth, // 枚の左端位置
    );

    // プレイヤー3（左から3番目）
    this.drawPlayerStats(
      x + cellWidth * 2 + cellWidth / 2,
      y + 5,
      match.stats.player3.name,
      match.stats.player3.playCount,
      match.stats.player3.partnerCount,
      [match.stats.player3.matchCount1, match.stats.player3.matchCount2],
      cellWidth - 10,
      "right",
      x + cellWidth * 3, // 枚の右端位置
    );

    // プレイヤー4（右端）
    this.drawPlayerStats(
      x + cellWidth * 3 + cellWidth / 2,
      y + 5,
      match.stats.player4.name,
      match.stats.player4.playCount,
      match.stats.player4.partnerCount,
      [match.stats.player4.matchCount1, match.stats.player4.matchCount2],
      cellWidth - 10,
      "right",
      x + cellWidth * 4, // 枚の右端位置
    );
  }

  drawPlayerStats(
    x,
    y,
    name,
    playCount,
    partnerCount,
    matchCount,
    maxWidth,
    statsAlign = null,
    cellEdgeX = null,
  ) {
    // プレイヤー番号、名前、性別を分離
    let playerNumber = null;
    let playerName = name;
    let playerGender = "M"; // デフォルトは男性

    // フォーマット: "1. 太郎|M" または "1. 花子|F"
    const nameMatch = name.match(/^(\d+)\. (.+?)\|([MF])$/);
    if (nameMatch) {
      playerNumber = nameMatch[1];
      playerName = nameMatch[2];
      playerGender = nameMatch[3];
    } else if (name.match(/^(\d+)\. (.+)$/)) {
      // 性別情報がない場合（後方互換性）
      const match = name.match(/^(\d+)\. (.+)$/);
      playerNumber = match[1];
      playerName = match[2];
    } else if (/^\d+$/.test(name)) {
      // 番号のみの場合
      playerNumber = name;
      playerName = "";
    }

    // 3行レイアウト：バッジ → プレイヤー名 → 統計情報
    let currentY = y;

    // 1行目：プレイヤー番号バッジ
    if (playerNumber) {
      const badgeSize = 24;
      const badgeX = x;
      let badgeY;

      // プレイヤー名がない場合は縦横中央に配置
      if (!playerName) {
        badgeY = y + this.courtHeight / 2 - 8;
      } else {
        badgeY = currentY + badgeSize / 2 + 2;
      }

      // バッジに影を追加
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;

      // バッジ背景（プレイヤー番号に基づいた色）
      this.ctx.fillStyle = this.getBadgeColor(playerNumber);
      this.ctx.beginPath();
      this.ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
      this.ctx.fill();

      // 影をリセット
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      // バッジ枠線
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
      this.ctx.stroke();

      // 番号テキスト（影付き）
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 12px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(playerNumber, badgeX, badgeY);

      // 影をリセット
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      // プレイヤー名がある場合のみcurrentYを更新
      if (playerName) {
        currentY += badgeSize + 8;
      }
    }

    // 2行目：プレイヤー名（あれば、中央揃え）
    if (playerName) {
      // 影を追加（深く）
      this.ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      this.ctx.shadowBlur = 2;
      this.ctx.shadowOffsetX = 1;
      this.ctx.shadowOffsetY = 1;

      // 性別に応じた色を設定（男性：青系、女性：赤系）
      this.ctx.fillStyle = playerGender === "F" ? "#E91E63" : "#1976D2";
      this.ctx.font = "bold 20px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "top";
      this.ctx.fillText(this.truncateText(playerName, maxWidth), x, currentY);

      // 影をリセット
      this.ctx.shadowColor = "transparent";
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;

      currentY += 24;
    }

    // 3行目：統計情報
    if (playCount !== null && playCount !== undefined) {
      if (statsAlign && cellEdgeX !== null) {
        // 横並び表示（ダブルス用）
        this.ctx.font = "12px sans-serif";
        this.ctx.fillStyle = "#8B4789";
        this.ctx.textBaseline = "bottom";
        this.ctx.textAlign = statsAlign;

        const statsX = statsAlign === "left" ? cellEdgeX + 5 : cellEdgeX - 5;
        const bottomMargin = 10; // 下からの余白
        const statsY = y + this.courtHeight - bottomMargin;

        // 統計情報を横並びで表示
        const stats = [];
        stats.push(`🎾${playCount}`);
        stats.push(`👫${partnerCount}`);
        stats.push(`⚔️${matchCount[0]},${matchCount[1]}`);
        const statsText = stats.join(" ");

        this.ctx.fillText(statsText, statsX, statsY);
      } else {
        // 横並び表示（シングルス用）
        this.ctx.fillStyle = "#8B4789";
        this.ctx.font = "12px sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";

        const stats = [];

        // 出場
        stats.push(`🎾${playCount}`);

        // ペア（ダブルスの場合のみ）
        if (partnerCount !== null && partnerCount !== undefined) {
          stats.push(`👫${partnerCount}`);
        }

        // 対戦
        if (Array.isArray(matchCount)) {
          stats.push(`⚔️${matchCount[0]},${matchCount[1]}`);
        } else {
          stats.push(`⚔️${matchCount}`);
        }

        // 横並びで表示
        const statsText = stats.join(" ");
        this.ctx.fillText(statsText, x, currentY);
      }
    }
  }

  // プレイヤー番号に基づいてバッジ色を取得
  getBadgeColor(playerNumber) {
    const num = parseInt(playerNumber);
    if (isNaN(num)) return this.badgeColors[0];
    return this.badgeColors[(num - 1) % this.badgeColors.length];
  }

  // 角丸矩形を描画するヘルパーメソッド
  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - radius,
      y + height,
    );
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // テキストを指定幅で改行するヘルパーメソッド
  wrapText(text, maxWidth, font) {
    this.ctx.font = font;
    const words = text.split("");
    const lines = [];
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + words[i];
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  truncateText(text, maxWidth) {
    const metrics = this.ctx.measureText(text);
    if (metrics.width <= maxWidth) {
      return text;
    }

    let truncated = text;
    while (
      this.ctx.measureText(truncated + "...").width > maxWidth &&
      truncated.length > 0
    ) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + "...";
  }

  toDataURL() {
    return this.canvas.toDataURL("image/png", 1.0);
  }
}

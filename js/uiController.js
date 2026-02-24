/**
 * テニスローテーション表ジェネレーター - UIコントローラークラス
 */

class UIController {
  constructor() {
    this.form = document.getElementById("rotationForm");
    this.titleInput = document.getElementById("title");
    this.playerCountSelect = document.getElementById("playerCount");
    this.courtCountSelect = document.getElementById("courtCount");
    this.roundCountSelect = document.getElementById("roundCount");
    this.matchSubTypeSelect = document.getElementById("matchSubType");
    this.matchFormatRadios = document.querySelectorAll(
      'input[name="matchFormat"]',
    );
    this.participantsInput = document.getElementById("participants");
    this.participantCount = document.getElementById("participantCount");
    this.genderCheckboxGroup = document.getElementById("genderCheckboxGroup");
    this.genderCheckboxes = document.getElementById("genderCheckboxes");
    this.generateBtn = document.getElementById("generateBtn");
    this.formatBtn = document.getElementById("formatBtn");
    this.randomBtn = document.getElementById("randomBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.newBtn = document.getElementById("newBtn");
    this.newBtnTop = document.getElementById("newBtnTop");
    this.downloadBtn = document.getElementById("downloadBtn");
    this.downloadBtnTop = document.getElementById("downloadBtnTop");
    this.shareBtn = document.getElementById("shareBtn");
    this.shareBtnTop = document.getElementById("shareBtnTop");
    this.resultSection = document.getElementById("resultSection");
    this.errorMessage = document.getElementById("errorMessage");
    this.loading = document.getElementById("loading");

    this.currentCanvas = null;

    this.bindEvents();
    this.updatePlayerCountOptions(); // 初期化時に参加人数オプションを設定

    // デフォルトタイトルを設定（年始からの日数を計算）
    this.setDefaultTitle();

    // デフォルト値を設定（ダブルス、6人、1コート）
    setTimeout(() => {
      if (this.playerCountSelect.querySelector('option[value="6"]')) {
        this.playerCountSelect.value = "6";
      }
    }, 0);

    // ローカルストレージから前回の入力内容を復元
    this.loadFromLocalStorage();

    // 入力内容の変更時に自動保存
    this.setupAutoSave();

    // デバッグモードじゃない場合、カスタマイズ方式を非表示にする
    if (!isDebugMode()) {
      const customOption = document.querySelector('option[value="custom"]');
      if (customOption) {
        customOption.style.display = "none";
      }
      const customWeightsGroup = document.getElementById("customWeightsGroup");
      if (customWeightsGroup) {
        customWeightsGroup.style.display = "none";
      }
      const customExplanation = document.getElementById("customExplanation");
      if (customExplanation) {
        customExplanation.style.display = "none";
      }
    } else {
      // デバッグモード時は説明を表示
      const customExplanation = document.getElementById("customExplanation");
      if (customExplanation) {
        customExplanation.style.display = "inline";
      }
    }
  }

  setDefaultTitle() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear =
      Math.floor((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    this.titleInput.value = `第${dayOfYear}回 フレームショット選手権`;
  }

  /**
   * ローカルストレージに入力内容を保存（12時間の有効期限付き）
   */
  /**
   * 入力内容をローカルストレージに保存
   *
   * ユーザーが入力したフォーム内容（参加者数、コート数、ラウンド数、性別設定など）を
   * ブラウザのローカルストレージに保存します。タイムスタンプも記録し、
   * 次回読み込み時に有効期限チェック（12時間）に使用します。
   */
  saveToLocalStorage() {
    const selectedFormat =
      Array.from(this.matchFormatRadios).find((radio) => radio.checked)
        ?.value || "doubles";
    const data = {
      title: this.titleInput.value,
      participants: this.participantsInput.value,
      playerCount: this.playerCountSelect.value,
      courtCount: this.courtCountSelect.value,
      roundCount: this.roundCountSelect.value,
      matchFormat: selectedFormat,
      matchSubType: this.matchSubTypeSelect.value,
      genders: this.getGenderSelections(),
      timestamp: Date.now(), // 保存時刻を記録（ミリ秒単位）
    };

    // カスタマイズ方式の場合はカスタム重みも保存
    if (this.matchSubTypeSelect.value === "custom") {
      data.customWeights = this.getCustomWeights();
    }

    localStorage.setItem("tennisRotationData", JSON.stringify(data));
  }

  /**
   * ローカルストレージから入力内容を復元（12時間有効期限チェック付き）
   *
   * 前回保存したフォーム入力内容を復元します。
   * ただしデータの保存から12時間以上経過していない場合のみ復元します。
   * 有効期限切れの場合はストレージを削除して初期化します。
   *
   * 有効期限チェック：
   * - 保存時刻 + 12時間 > 現在時刻 → 復元
   * - 保存時刻 + 12時間 <= 現在時刻 → 削除して初期化
   */
  loadFromLocalStorage() {
    // URLパラメータをチェック
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.entries().length > 0) {
      // URLパラメータがある場合は、URLから値を復元
      if (urlParams.has("title")) {
        this.titleInput.value = urlParams.get("title");
      }
      if (urlParams.has("participants")) {
        this.participantsInput.value = urlParams.get("participants");
      }
      if (urlParams.has("playerCount")) {
        this.playerCountSelect.value = urlParams.get("playerCount");
      }
      if (urlParams.has("courtCount")) {
        this.courtCountSelect.value = urlParams.get("courtCount");
      }
      if (urlParams.has("roundCount")) {
        this.roundCountSelect.value = urlParams.get("roundCount");
      }
      if (urlParams.has("matchFormat")) {
        const formatRadio = Array.from(this.matchFormatRadios).find(
          (radio) => radio.value === urlParams.get("matchFormat"),
        );
        if (formatRadio) {
          formatRadio.checked = true;
        }
      }
      if (urlParams.has("matchSubType")) {
        this.matchSubTypeSelect.value = urlParams.get("matchSubType");
      }
      if (urlParams.has("genders")) {
        const gendersStr = urlParams.get("genders");
        setTimeout(() => this.setGenderSelections(gendersStr.split(",")), 0);
      }

      this.updatePlayerCountOptions();
      this.updateParticipantCount();
      this.toggleGenderInput();
      this.updateMatchSubTypeOptions();
      return;
    }

    const data = localStorage.getItem("tennisRotationData");
    if (data) {
      try {
        const saved = JSON.parse(data);

        // 12時間の有効期限をチェック（43,200,000ミリ秒 = 12時間 × 60分 × 60秒 × 1000）
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        const currentTime = Date.now();
        const savedTime = saved.timestamp || 0;

        if (currentTime - savedTime > TWELVE_HOURS) {
          // 有効期限切れ → ストレージを削除して初期状態に戻す
          localStorage.removeItem("tennisRotationData");
          this.updateMatchSubTypeOptions();
          return;
        }

        this.titleInput.value = saved.title || this.titleInput.value;
        this.participantsInput.value = saved.participants || "";
        this.playerCountSelect.value = saved.playerCount || "6";
        this.courtCountSelect.value = saved.courtCount || "1";
        this.roundCountSelect.value = saved.roundCount || "10";

        // matchFormatを復元
        const savedFormat = saved.matchFormat || "doubles";
        const formatRadio = Array.from(this.matchFormatRadios).find(
          (radio) => radio.value === savedFormat,
        );
        if (formatRadio) {
          formatRadio.checked = true;
        }

        this.matchSubTypeSelect.value = saved.matchSubType || "balanced";
        this.updatePlayerCountOptions();
        this.updateParticipantCount();
        this.toggleGenderInput();
        this.updateMatchSubTypeOptions();
        // 性別情報を復元
        if (saved.genders) {
          setTimeout(() => this.setGenderSelections(saved.genders), 0);
        }
        // カスタム重みを復元
        if (saved.customWeights) {
          setTimeout(() => this.setCustomWeights(saved.customWeights), 0);
        }
      } catch (e) {
        console.error("Failed to load from localStorage:", e);
        localStorage.removeItem("tennisRotationData"); // エラー時は削除
      }
    } else {
      // 初回起動時はupdateMatchSubTypeOptionsを実行
      this.updateMatchSubTypeOptions();
    }
  }

  /**
   * 自動保存の設定
   */
  setupAutoSave() {
    this.titleInput.addEventListener("change", () => this.saveToLocalStorage());
    this.participantsInput.addEventListener("change", () =>
      this.saveToLocalStorage(),
    );
    this.playerCountSelect.addEventListener("change", () =>
      this.saveToLocalStorage(),
    );
    this.courtCountSelect.addEventListener("change", () =>
      this.saveToLocalStorage(),
    );
    this.roundCountSelect.addEventListener("change", () =>
      this.saveToLocalStorage(),
    );
    this.matchSubTypeSelect.addEventListener("change", () =>
      this.saveToLocalStorage(),
    );
    this.matchFormatRadios.forEach((radio) => {
      radio.addEventListener("change", () => this.saveToLocalStorage());
    });

    // カスタム重みの変更を検知して自動保存
    const customWeightKeys = [
      "POS1_PLAY_COUNT",
      "POS1_CONSECUTIVE_REST",
      "POS2_PARTNER_HISTORY",
      "POS2_MATCH_HISTORY",
      "POS2_PLAY_COUNT",
      "POS2_CONSECUTIVE_REST",
      "POS3_PLAY_COUNT",
      "POS3_CONSECUTIVE_REST",
      "POS3_PARTNER_HISTORY",
      "POS3_MATCH_HISTORY",
      "POS4_PLAY_COUNT",
      "POS4_CONSECUTIVE_REST",
      "POS4_PARTNER_HISTORY",
      "POS4_MATCH_HISTORY",
      "MIXED_BONUS",
    ];

    customWeightKeys.forEach((key) => {
      const input = document.getElementById(`custom_${key}`);
      if (input) {
        input.addEventListener("change", () => this.saveToLocalStorage());
      }
    });
  }

  /**
   * 試合形式に応じて対戦方式の表示を更新
   */
  updateMatchSubTypeOptions() {
    const selectedFormat = Array.from(this.matchFormatRadios).find(
      (radio) => radio.checked,
    )?.value;

    const mixedOption = document.getElementById("mixedOption");
    const mixedExplanation = document.getElementById("mixedExplanation");

    if (selectedFormat === "doubles-mixed") {
      // ダブルス(ミックス優先)が選択されている場合：男女混合重視型を表示して性別入力を表示
      if (mixedOption) {
        mixedOption.style.display = "";
        // バランス型をデフォルト選択
        this.matchSubTypeSelect.value = "balanced";
      }
      if (mixedExplanation) {
        mixedExplanation.style.display = "";
      }
      // 性別選択フィールドを表示
      if (this.genderCheckboxGroup) {
        this.genderCheckboxGroup.style.display = "block";
        // チェックボックスを更新
        this.updateGenderCheckboxes();
      }
    } else {
      // ダブルスが選択されている場合：男女混合重視型を非表示にして性別入力を非表示
      if (mixedOption) {
        mixedOption.style.display = "none";
        // もし男女混合重視型が選択されていたら、バランス型に変更
        if (this.matchSubTypeSelect.value === "mixed") {
          this.matchSubTypeSelect.value = "balanced";
        }
      }
      if (mixedExplanation) {
        mixedExplanation.style.display = "none";
      }
      // 性別選択フィールドを非表示
      if (this.genderCheckboxGroup) {
        this.genderCheckboxGroup.style.display = "none";
      }
    }

    // カスタマイズ方式の表示/非表示を制御
    this.toggleCustomWeightsDisplay();
  }

  /**
   * カスタマイズ方式の重み設定フォームの表示/非表示を制御
   */
  toggleCustomWeightsDisplay() {
    const customWeightsGroup = document.getElementById("customWeightsGroup");
    const selectedSubType = this.matchSubTypeSelect.value;

    if (selectedSubType === "custom" && customWeightsGroup) {
      customWeightsGroup.style.display = "block";
    } else if (customWeightsGroup) {
      customWeightsGroup.style.display = "none";
    }
  }

  /**
   * カスタマイズ方式で設定された重みを取得
   */
  getCustomWeights() {
    const weights = {};
    const weightKeys = [
      "POS1_PLAY_COUNT",
      "POS1_CONSECUTIVE_REST",
      "POS2_PARTNER_HISTORY",
      "POS2_MATCH_HISTORY",
      "POS2_PLAY_COUNT",
      "POS2_CONSECUTIVE_REST",
      "POS3_PLAY_COUNT",
      "POS3_CONSECUTIVE_REST",
      "POS3_PARTNER_HISTORY",
      "POS3_MATCH_HISTORY",
      "POS4_PLAY_COUNT",
      "POS4_CONSECUTIVE_REST",
      "POS4_PARTNER_HISTORY",
      "POS4_MATCH_HISTORY",
      "MIXED_BONUS",
    ];

    weightKeys.forEach((key) => {
      const input = document.getElementById(`custom_${key}`);
      if (input) {
        weights[key] = parseFloat(input.value) || 0;
      }
    });

    return weights;
  }

  /**
   * 現在の性別選択状態を取得
   */
  getGenderSelections() {
    const genders = [];
    const playerCount = parseInt(this.playerCountSelect.value) || 0;
    for (let i = 0; i < playerCount; i++) {
      const mRadio = document.getElementById(`gender_${i}_M`);
      const fRadio = document.getElementById(`gender_${i}_F`);
      if (mRadio && mRadio.checked) {
        genders[i] = "M";
      } else if (fRadio && fRadio.checked) {
        genders[i] = "F";
      }
    }
    return genders;
  }

  /**
   * 性別選択状態を復元
   */
  setGenderSelections(genders) {
    if (!genders || genders.length === 0) return;
    genders.forEach((gender, i) => {
      if (gender === "M") {
        const radio = document.getElementById(`gender_${i}_M`);
        if (radio) {
          radio.checked = true;
          // カード背景色を青系に変更
          const card = document.getElementById(`card_${i}`);
          if (card) {
            card.style.background = "#E3F2FD";
            card.style.borderColor = "#90CAF9";
          }
        }
      } else if (gender === "F") {
        const radio = document.getElementById(`gender_${i}_F`);
        if (radio) {
          radio.checked = true;
          // カード背景色をピンク系に変更
          const card = document.getElementById(`card_${i}`);
          if (card) {
            card.style.background = "#FFEEF5";
            card.style.borderColor = "#FFB6D9";
          }
        }
      }
    });
  }

  /**
   * カスタム重みを入力フィールドに設定
   */
  setCustomWeights(weights) {
    if (!weights) return;
    Object.keys(weights).forEach((key) => {
      const input = document.getElementById(`custom_${key}`);
      if (input) {
        input.value = weights[key];
      }
    });
  }

  /**
   * 性別を一括設定（男性のみ）
   */
  setAllMale() {
    const playerCount = parseInt(this.playerCountSelect.value) || 0;
    for (let i = 0; i < playerCount; i++) {
      const radio = document.getElementById(`gender_${i}_M`);
      if (radio) {
        radio.checked = true;
        // カード背景色を青系に変更
        const card = document.getElementById(`card_${i}`);
        if (card) {
          card.style.background = "#E3F2FD";
          card.style.borderColor = "#90CAF9";
        }
      }
    }
    // 自動保存
    this.saveToLocalStorage();
  }

  /**
   * 性別を一括設定（女性のみ）
   */
  setAllFemale() {
    const playerCount = parseInt(this.playerCountSelect.value) || 0;
    for (let i = 0; i < playerCount; i++) {
      const radio = document.getElementById(`gender_${i}_F`);
      if (radio) {
        radio.checked = true;
        // カード背景色をピンク系に変更
        const card = document.getElementById(`card_${i}`);
        if (card) {
          card.style.background = "#FFEEF5";
          card.style.borderColor = "#FFB6D9";
        }
      }
    }
    // 自動保存
    this.saveToLocalStorage();
  }

  /**
   * 性別を一括設定（交互）
   */
  setAlternateGender() {
    const playerCount = parseInt(this.playerCountSelect.value) || 0;
    for (let i = 0; i < playerCount; i++) {
      const isMale = i % 2 === 0;
      const radio = isMale
        ? document.getElementById(`gender_${i}_M`)
        : document.getElementById(`gender_${i}_F`);
      if (radio) {
        radio.checked = true;
        // カード背景色を性別に応じて変更
        const card = document.getElementById(`card_${i}`);
        if (card) {
          if (isMale) {
            card.style.background = "#E3F2FD";
            card.style.borderColor = "#90CAF9";
          } else {
            card.style.background = "#FFEEF5";
            card.style.borderColor = "#FFB6D9";
          }
        }
      }
    }
    // 自動保存
    this.saveToLocalStorage();
  }

  bindEvents() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.generateRotation();
    });

    this.formatBtn.addEventListener("click", () => {
      this.formatParticipants();
    });

    this.randomBtn.addEventListener("click", () => {
      this.randomizeParticipants();
    });

    this.newBtn.addEventListener("click", () => {
      this.resetForm();
    });

    this.newBtnTop.addEventListener("click", () => {
      this.resetForm();
    });

    this.resetBtn.addEventListener("click", () => {
      this.resetForm();
    });

    this.downloadBtn.addEventListener("click", () => {
      this.downloadImage();
    });

    this.downloadBtnTop.addEventListener("click", () => {
      this.downloadImage();
    });

    this.shareBtn.addEventListener("click", () => {
      this.shareUrl();
    });

    this.shareBtnTop.addEventListener("click", () => {
      this.shareUrl();
    });

    // 試合形式が変更されたら対戦方式の表示を制御
    this.matchFormatRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        this.updateMatchSubTypeOptions();
      });
    });

    // コート数が変更されたら参加人数の選択肢を更新
    this.courtCountSelect.addEventListener("change", () => {
      this.updatePlayerCountOptions();
    });

    // 対戦方式が変更されたら性別入力フィールドの表示を切り替え
    this.matchSubTypeSelect.addEventListener("change", () => {
      this.toggleGenderInput();
      this.toggleCustomWeightsDisplay();
    });

    // 参加者名入力時に人数を表示
    this.participantsInput.addEventListener("input", () => {
      this.updateParticipantCount();
    });

    // 参加人数選択時にも警告チェック
    this.playerCountSelect.addEventListener("change", () => {
      this.updateParticipantCount();
      // 参加人数が変更されたら性別チェックボックスも更新
      this.updateGenderCheckboxes();
    });
  }

  updateParticipantCount() {
    const text = this.participantsInput.value;
    const names = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const count = names.length;
    const selectedCount = parseInt(this.playerCountSelect.value) || 0;

    if (count === 0) {
      this.participantCount.textContent = "※ 0名が入力されています";
      this.participantCount.style.color = "#999";
      this.participantCount.style.backgroundColor = "transparent";
      this.participantCount.style.fontWeight = "normal";
    } else if (selectedCount > 0 && count !== selectedCount) {
      // 警告表示
      if (count > selectedCount) {
        this.participantCount.textContent = `⚠️ ${count}名が入力されています（参加人数: ${selectedCount}名）最初の${selectedCount}名のみ使用されます`;
      } else {
        this.participantCount.textContent = `⚠️ ${count}名が入力されています（参加人数: ${selectedCount}名）不足分は番号で補完されます`;
      }
      this.participantCount.style.color = "#ff6b6b";
      this.participantCount.style.backgroundColor = "#ffe5e5";
      this.participantCount.style.fontWeight = "bold";
      this.participantCount.style.padding = "8px";
      this.participantCount.style.borderRadius = "4px";
    } else {
      this.participantCount.textContent = `✓ ${count}名が入力されています`;
      this.participantCount.style.color = "#667eea";
      this.participantCount.style.backgroundColor = "transparent";
      this.participantCount.style.fontWeight = "normal";
      this.participantCount.style.padding = "0";
    }

    // ミックス優先モードの場合はチェックボックスも更新
    if (this.matchSubTypeSelect.value === "mixed") {
      this.updateGenderCheckboxes();
    }
  }

  updatePlayerCountOptions() {
    const courtCount = parseInt(this.courtCountSelect.value) || 1;
    const currentValue = this.playerCountSelect.value;
    const helpText = document.getElementById("playerCountHelp");

    // 既存のオプションをクリア
    this.playerCountSelect.innerHTML =
      '<option value="">選択してください</option>';

    let minPlayers;
    let maxPlayers = 60;

    // ダブルス：1コートあたり最低4名
    minPlayers = Math.max(4, courtCount * 4);

    for (let i = minPlayers; i <= maxPlayers; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${i}人`;
      this.playerCountSelect.appendChild(option);
    }
    helpText.textContent = `※最低${minPlayers}人（${courtCount}コート×4名）`;

    // 以前選択されていた値が新しいオプションに存在する場合は復元、そうでない場合は最小人数を自動選択
    if (
      currentValue &&
      this.playerCountSelect.querySelector(`option[value="${currentValue}"]`)
    ) {
      this.playerCountSelect.value = currentValue;
    } else {
      // 最小人数を自動選択
      this.playerCountSelect.value = minPlayers;
    }
  }

  updateGenderCheckboxes() {
    const playerCount = parseInt(this.playerCountSelect.value);
    if (!playerCount) {
      this.genderCheckboxes.innerHTML =
        '<p style="color: #999;">※参加人数を先に選択してください</p>';
      return;
    }

    // 参加者名を取得
    const text = this.participantsInput.value;
    const inputNames = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // チェックボックスを生成
    let html = "";
    for (let i = 0; i < playerCount; i++) {
      const playerName = inputNames[i] || `プレイヤー${i + 1}`;
      const label = `${i + 1}. ${playerName}`;

      // 現在の選択状態を保持
      const currentM = document.getElementById(`gender_${i}_M`);
      const currentF = document.getElementById(`gender_${i}_F`);
      const checkedM = currentM && currentM.checked ? "checked" : "";
      const checkedF = currentF && currentF.checked ? "checked" : "";
      const defaultChecked = !checkedM && !checkedF ? "checked" : "";

      // デフォルトでは男性が選択されているため、カード全体の背景色を青系に
      const cardBgColor = checkedF ? "#FFEEF5" : "#E3F2FD";
      const cardBorderColor = checkedF ? "#FFB6D9" : "#90CAF9";

      html += `
        <div id="card_${i}" style="border: 2px solid ${cardBorderColor}; border-radius: 8px; padding: 10px; background: ${cardBgColor}; transition: all 0.3s;">
          <div style="font-weight: 600; margin-bottom: 8px; color: #333;">${label}</div>
          <div style="display: flex; gap: 15px; justify-content: center;">
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="radio" name="gender_${i}" id="gender_${i}_M" value="M" ${
                checkedM || defaultChecked
              } style="margin-right: 5px;" onchange="document.getElementById('card_${i}').style.background='#E3F2FD'; document.getElementById('card_${i}').style.borderColor='#90CAF9';">
              <span style="font-weight: 500;">👨 男性</span>
            </label>
            <label style="display: flex; align-items: center; cursor: pointer;">
              <input type="radio" name="gender_${i}" id="gender_${i}_F" value="F" ${checkedF} style="margin-right: 5px;" onchange="document.getElementById('card_${i}').style.background='#FFEEF5'; document.getElementById('card_${i}').style.borderColor='#FFB6D9';">
              <span style="font-weight: 500;">👩 女性</span>
            </label>
          </div>
        </div>
      `;
    }

    this.genderCheckboxes.innerHTML = html;
  }

  toggleGenderInput() {
    const selectedFormat = Array.from(this.matchFormatRadios).find(
      (radio) => radio.checked,
    )?.value;
    const isMixed = this.matchSubTypeSelect.value === "mixed";

    // 試合形式「ダブルス(ミックス優先)」が選ばれている場合は、対戦方式に関わらず性別フィールドを表示
    const isDoublesWithMixed = selectedFormat === "doubles-mixed";
    const shouldShowGender = isDoublesWithMixed || isMixed;

    this.genderCheckboxGroup.style.display = shouldShowGender
      ? "block"
      : "none";

    // 性別フィールドを表示する場合にチェックボックスを更新
    if (shouldShowGender) {
      this.updateGenderCheckboxes();
    }
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add("show");
    setTimeout(() => {
      this.errorMessage.classList.remove("show");
    }, 5000);
  }

  showLoading(show) {
    if (show) {
      this.loading.classList.add("show");
      this.generateBtn.disabled = true;
    } else {
      this.loading.classList.remove("show");
      this.generateBtn.disabled = false;
    }
  }

  formatParticipants() {
    const text = this.participantsInput.value;
    if (!text.trim()) {
      this.showError("整形する名前を入力してください");
      return;
    }

    // 1. 改行、タブ、カンマ、スペース（全角・半角）で分割
    const separators = /[\n\r\t,、\s　]+/;
    let names = text
      .split(separators)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // 2. 各名前から先頭の番号を削除
    names = names
      .map((name) => {
        // 半角数字 + 区切り文字（. ) : など）を削除
        let formatted = name.replace(/^\d+[.):：)）]\s*/, "");
        // 全角数字 + 区切り文字を削除
        formatted = formatted.replace(/^[０-９]+[.):：)）]\s*/, "");
        // 丸数字を削除（①②③...）
        formatted = formatted.replace(/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/, "");
        // 括弧付き数字を削除（(1) (2) ...）
        formatted = formatted.replace(/^\(\d+\)\s*/, "");
        formatted = formatted.replace(/^（\d+）\s*/, "");
        return formatted.trim();
      })
      .filter((name) => name.length > 0);

    // 3. 重複を削除
    names = [...new Set(names)];

    // 4. 整形結果をテキストエリアに反映
    this.participantsInput.value = names.join("\n");

    // 参加者数を更新
    this.updateParticipantCount();

    // 5. 成功メッセージ（エラーメッセージの代わりに使用）
    const originalError = this.errorMessage.style.backgroundColor;
    this.errorMessage.style.backgroundColor = "#e8f5e9";
    this.errorMessage.style.color = "#2e7d32";
    this.errorMessage.textContent = `✓ ${names.length}名の名前を整形しました`;
    this.errorMessage.classList.add("show");
    setTimeout(() => {
      this.errorMessage.classList.remove("show");
      setTimeout(() => {
        this.errorMessage.style.backgroundColor = originalError;
        this.errorMessage.style.color = "#c33";
      }, 300);
    }, 2000);
  }

  randomizeParticipants() {
    const text = this.participantsInput.value;
    if (!text.trim()) {
      this.showError("ランダムにする名前を入力してください");
      return;
    }

    // 名前を取得
    let names = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (names.length < 2) {
      this.showError("ランダムにするには2名以上必要です");
      return;
    }

    // Fisher-Yates シャッフルアルゴリズム
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }

    // ランダム順をテキストエリアに反映
    this.participantsInput.value = names.join("\n");

    // 参加者数を更新
    this.updateParticipantCount();

    // 成功メッセージ
    const originalError = this.errorMessage.style.backgroundColor;
    this.errorMessage.style.backgroundColor = "#e8f5e9";
    this.errorMessage.style.color = "#2e7d32";
    this.errorMessage.textContent = `✓ ${names.length}名をランダム順に並べ替えました`;
    this.errorMessage.classList.add("show");
    setTimeout(() => {
      this.errorMessage.classList.remove("show");
      setTimeout(() => {
        this.errorMessage.style.backgroundColor = originalError;
        this.errorMessage.style.color = "#c33";
      }, 300);
    }, 2000);
  }

  /**
   * 現在の設定を URL パラメータにしてクリップボードにコピー
   */
  shareUrl() {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    // フォーム値をパラメータに追加
    params.append("title", this.titleInput.value);
    params.append("playerCount", this.playerCountSelect.value);
    params.append("courtCount", this.courtCountSelect.value);
    params.append("roundCount", this.roundCountSelect.value);
    params.append(
      "matchFormat",
      Array.from(this.matchFormatRadios).find((radio) => radio.checked)?.value,
    );
    params.append("matchSubType", this.matchSubTypeSelect.value);
    params.append("participants", this.participantsInput.value);

    // 性別情報を追加
    const genders = this.getGenderSelections();
    if (genders.length > 0) {
      params.append("genders", genders.join(","));
    }

    const shareUrl = baseUrl + "?" + params.toString();

    // クリップボードにコピー
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        this.showMessage("✅ URL をクリップボードにコピーしました", "success");
      })
      .catch(() => {
        // フォールバック: 手動コピーの案内
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        this.showMessage("✅ URL をクリップボードにコピーしました", "success");
      });
  }

  parseParticipants(text, playerCount) {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // 参加者名が入力されていない場合は番号のみで生成
    if (lines.length === 0) {
      return Array.from({ length: playerCount }, (_, i) => `${i + 1}`);
    }

    const names = [...lines];

    // 入力された名前を使用し、不足分は番号で補完
    if (names.length < playerCount) {
      const remaining = playerCount - names.length;
      for (let i = 0; i < remaining; i++) {
        names.push(`${names.length + 1}`);
      }
    }

    // 全ての名前を返す（先頭の番号付け記号は保持）
    return names.slice(0, playerCount);
  }

  getMatchType() {
    return "doubles";
  }

  /**
   * デバッグログを表示
   */
  generateDebugTable(rotation, title) {
    if (!isDebugMode()) {
      return;
    }

    const container = document.getElementById("debugTableContainer");
    let html = `
      <div style="margin-bottom: 20px; border: 2px solid #ff6b6b; border-radius: 8px; padding: 15px; background: #ffe5e5;">
        <h3 style="color: #c33; margin-bottom: 10px; font-size: 16px;">🔍 デバッグモード - 生成ログ</h3>
    `;

    // デバッグログを表示
    if (rotation.debugLogs && rotation.debugLogs.length > 0) {
      html += `
        <div style="border: 1px solid #ffb6d9; border-radius: 6px; padding: 10px; background: #fff; max-height: 400px; overflow-y: auto;">
          <pre style="margin: 0; font-size: 12px; font-family: 'Monaco', 'Courier New', monospace; color: #333; white-space: pre-wrap; word-break: break-word;">
      `;

      // ログを表示（改行を保持）
      rotation.debugLogs.forEach((log) => {
        html += log + "\n";
      });

      html += `
          </pre>
        </div>
      `;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  async generateRotation() {
    const title = this.titleInput.value.trim();
    const playerCount = parseInt(this.playerCountSelect.value);
    const courtCount = parseInt(this.courtCountSelect.value);
    const roundCount = parseInt(this.roundCountSelect.value);
    const matchSubType = this.matchSubTypeSelect.value;
    const participantsText = this.participantsInput.value;

    if (!playerCount) {
      this.showError("参加人数を選択してください");
      return;
    }

    if (!courtCount) {
      this.showError("コート数を選択してください");
      return;
    }

    // 参加者名を取得（未入力の場合は番号で自動生成）
    const participants = this.parseParticipants(participantsText, playerCount);

    // 試合形式を取得
    const selectedFormat = Array.from(this.matchFormatRadios).find(
      (radio) => radio.checked,
    )?.value;

    // ミックス優先または試合形式がダブルス(ミックス優先)の場合は性別を取得
    let genders = null;
    if (matchSubType === "mixed" || selectedFormat === "doubles-mixed") {
      genders = [];
      for (let i = 0; i < playerCount; i++) {
        const mRadio = document.getElementById(`gender_${i}_M`);
        const fRadio = document.getElementById(`gender_${i}_F`);

        if (mRadio && mRadio.checked) {
          genders.push("M");
        } else if (fRadio && fRadio.checked) {
          genders.push("F");
        } else {
          this.showError(
            `${i + 1}番目のプレイヤーの性別が選択されていません。`,
          );
          return;
        }
      }
    }

    if (playerCount < 4) {
      this.showError("ダブルスには最低4人必要です");
      return;
    }

    // カスタマイズ方式の場合は、カスタム重みを反映させる
    if (matchSubType === "custom") {
      const customWeights = this.getCustomWeights();
      SCORING_WEIGHTS_PRESETS.custom = {
        ...SCORING_WEIGHTS_PRESETS.balanced,
        ...customWeights,
      };
    }

    this.showLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const rotation = new RotationGenerator(
        participants,
        courtCount,
        "doubles",
        roundCount,
        matchSubType,
        genders,
      );
      this.currentCanvas = new RotationCanvas(rotation, title, "doubles");
      this.currentCanvas.draw();

      // デバッグモードの場合、テーブル形式の対戦表を生成
      this.generateDebugTable(rotation, title);

      this.resultSection.classList.add("show");

      setTimeout(() => {
        this.resultSection.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";
      this.showError(
        "ローテーション表の生成中にエラーが発生しました: " + errorMessage,
      );
      console.error("エラー詳細:", error);
      console.error("スタックトレース:", errorStack);
      if (isDebugMode()) {
        console.log("=== エラー詳細 ===");
        console.log(`エラーメッセージ: ${errorMessage}`);
        console.log(`スタックトレース:\n${errorStack}`);
        console.log("==================");
      }
    } finally {
      this.showLoading(false);
    }
  }

  async downloadImage() {
    if (!this.currentCanvas) return;

    try {
      const dataURL = this.currentCanvas.toDataURL();
      const link = document.createElement("a");
      const fileName = `rotation_${Date.now()}.png`;

      link.download = fileName;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      this.showError("画像の保存中にエラーが発生しました");
      console.error(error);
    }
  }

  resetForm() {
    this.form.reset();
    this.resultSection.classList.remove("show");
    this.currentCanvas = null;
    this.updatePlayerCountOptions(); // フォームリセット時に参加人数オプションを再設定

    // デフォルト値に合わせてリセット
    this.setDefaultTitle();
    this.playerCountSelect.value = "6";
    this.matchSubTypeSelect.value = "balanced";
    this.roundCountSelect.value = "25";

    // 試合形式をダブルスに設定
    const doublesRadio = document.querySelector(
      'input[name="matchFormat"][value="doubles"]',
    );
    if (doublesRadio) {
      doublesRadio.checked = true;
    }

    // 試合形式の変更を反映（対戦方式と性別選択の表示/非表示を更新）
    this.updateMatchSubTypeOptions();

    // コート数は最初の選択肢に（ユーザーが選択するため）
    if (this.courtCountSelect.options.length > 1) {
      this.courtCountSelect.selectedIndex = 1;
    }

    // 参加者テキストをクリア
    this.participantsInput.value = "";
    this.updateParticipantCount();

    // 性別チェックボックスをクリア
    const checkboxes = document.querySelectorAll('input[name="gender"]');
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });

    // カスタム重みをリセット
    const defaultCustomWeights = SCORING_WEIGHTS_PRESETS.balanced;
    this.setCustomWeights(defaultCustomWeights);

    // ローカルストレージをクリア
    localStorage.removeItem("tennisRotationData");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

// アプリケーション初期化
let uiController;
document.addEventListener("DOMContentLoaded", () => {
  uiController = new UIController();
});

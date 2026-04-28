<script setup>
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '../stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()

const modes = [
  { value: 'normal', key: 'params.modeNormal' },
  { value: 'mixed', key: 'params.modeMixed' },
  { value: 'rivals', key: 'params.modeRivals' },
  { value: 'mixedRivals', key: 'params.modeMixedRivals' },
]
</script>

<template>
  <div class="basic-params">
    <h2>{{ t('nav.params') }}</h2>

    <div class="params-grid">
      <div class="param-row">
        <label class="param-label">{{ t('params.courts') }}</label>
        <div class="stepper">
          <button
            class="stepper-btn"
            :disabled="settings.courts <= 1"
            @click="settings.courts = Math.max(1, settings.courts - 1)"
            aria-label="Decrease courts"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
          <span class="stepper-val">{{ settings.courts }}</span>
          <button
            class="stepper-btn"
            :disabled="settings.courts >= 10"
            @click="settings.courts = Math.min(10, settings.courts + 1)"
            aria-label="Increase courts"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 2v8M2 6h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="param-row">
        <label class="param-label">{{ t('params.rounds') }}</label>
        <div class="rounds-input">
          <label class="checkbox-label">
            <input type="checkbox" :checked="settings.rounds === 0" @change="e => settings.rounds = e.target.checked ? 0 : 10" />
            <span>{{ t('params.autoRounds') }}</span>
          </label>
          <input
            v-if="settings.rounds !== 0"
            type="number"
            v-model.number="settings.rounds"
            min="1"
            max="200"
            class="input-number"
          />
        </div>
      </div>

      <div class="param-row param-row-mode">
        <label class="param-label">{{ t('params.mode') }}</label>
        <div class="mode-pills">
          <button
            v-for="m in modes"
            :key="m.value"
            class="pill"
            :class="{ active: settings.mode === m.value }"
            @click="settings.mode = m.value"
          >
            {{ t(m.key) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-params { display: flex; flex-direction: column; gap: 1.5rem; }

.params-grid {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  overflow: hidden;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}
.param-row:last-child { border-bottom: none; }
.param-row:hover { background: var(--surface); }

.param-label {
  width: 7rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--text-h);
  flex-shrink: 0;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text);
  transition: background 0.15s, transform 0.1s, color 0.15s;
}
.stepper-btn:hover:not(:disabled) { background: var(--border); }
.stepper-btn:active:not(:disabled) { transform: scale(0.92); }
.stepper-btn:disabled { color: var(--text-muted); cursor: not-allowed; }

.stepper-val {
  width: 2.5rem;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 700;
  font-family: var(--mono);
  color: var(--text-h);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  line-height: 2.2rem;
}

.rounds-input { display: flex; align-items: center; gap: 0.75rem; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text);
  user-select: none;
}

.input-number { width: 5.5rem; text-align: center; font-family: var(--mono); }

.mode-pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }

.pill {
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: var(--sans);
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}
.pill:hover { border-color: var(--accent-border); color: var(--accent); }
.pill:active { transform: scale(0.96); }
.pill.active {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
  box-shadow: 0 2px 8px var(--accent-glow);
  font-weight: 600;
}

@media (max-width: 640px) {
  .param-row { padding: 0.85rem 1rem; }
  .param-label { width: auto; min-width: 5.5rem; }
  .param-row-mode { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
}
</style>

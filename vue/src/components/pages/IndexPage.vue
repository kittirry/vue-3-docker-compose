<template>
  <div class="game-area">
    <div class="game-area__content">
      <h2 class="game-area__title">Пятнашки {{ boardSize }}×{{ boardSize }}</h2>

      <div v-if="gameCompleted" class="game-area__message">ПОБЕДА!</div>

      <div class="game-area__stats">
        Ходы: {{ stepCount }}
      </div>

      <div class="game-area__stats game-area__stats--timer">
        Время: {{ formattedElapsed }}
        <span v-if="isFastForward" class="game-area__stats--fast"> ⚡</span>
      </div>

      <div class="game-area__stats game-area__stats--free">
        Свободные ходы: {{ freeMoveTokens }}
      </div>

      <div
          v-if="secondsUntilNextFree !== null"
          class="game-area__stats game-area__stats--next-free"
      >
        До следующего бонуса: {{ secondsUntilNextFree }} с
      </div>

      <div class="game-area__mode">
        <label class="game-area__mode-label">
          <input
              class="game-area__mode-input"
              type="checkbox"
              :checked="randomBlockMode"
              @change="() => onRandomBlockChange($event)"
          >
          <span class="game-area__mode-text">Случайная блокировка</span>
        </label>

        <label class="game-area__mode-label">
          <input
              class="game-area__mode-input"
              type="checkbox"
              :checked="freezeMode"
              @change="() => onFreezeModeChange($event)"
          >
          <span class="game-area__mode-text">Заморозка на месте</span>
        </label>
      </div>

      <div class="game-area__records">
        <div class="game-area__records-title">Рекорды (лучшее время, сек)</div>
        <div v-if="bestTimeForCurrentSize !== null" class="game-area__records-best">
          Рекорд для этого поля: {{ formatSeconds(bestTimeForCurrentSize) }}
        </div>
        <div v-else class="game-area__records-best">
          Рекорд для этого поля: пока нет
        </div>
        <ul class="game-area__records-list">
          <li
              v-for="entry in recordsList"
              :key="entry.key"
              class="game-area__records-item"
          >
            {{ entry.label }}
          </li>
        </ul>
      </div>

      <div
          class="game-area__field"
          :style="fieldCssVars"
          @touchstart="() => handleTouchStart($event)"
          @touchend="() => handleTouchEnd($event)"
      >
        <PuzzleTile
            v-for="item in tileArray"
            :key="item.pos"
            :num="item.num"
            :is-void="item.isVoid"
            :finished="gameCompleted"
            :is-disabled="tileIsDisabled(item.pos)"
            :is-frozen="item.isFrozen"
            @click="() => onTileTap(item.pos)"
        />
      </div>

      <div class="game-area__controls">
        <button
            class="game-area__btn game-area__btn--minus"
            type="button"
            :disabled="boardSize <= minBoardSize"
            @click="() => resizeBoardDelta(-1)"
        >
          −
        </button>

        <button
            class="game-area__btn game-area__btn--reset"
            type="button"
            @click="() => resetGame()"
        >
          Перемешать
        </button>

        <button
            class="game-area__btn game-area__btn--plus"
            type="button"
            @click="() => resizeBoardDelta(1)"
        >
          +
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import { mapState, mapGetters, mapActions } from 'vuex'
import PuzzleTile from './PuzzleTile.vue'

const IndexPage = defineComponent({
  name: 'IndexPage',
  components: {
    PuzzleTile,
  },
  data () {
    return {
      touchStartX: 0,
      touchStartY: 0,
      timerId: null,
    }
  },
  computed: {
    ...mapState('puzzle', [
      'boardSize',
      'stepCount',
      'randomBlockMode',
      'freezeMode',
      'elapsedSeconds',
      'freeMoveTokens',
      'blockedPosition',
      'records',
      'gameCompleted',
      'isFastForward',
    ]),
    ...mapGetters('puzzle', {
      winStatus: 'isWin',
      tileArray: 'tileArray',
      bestTimeForCurrentSize: 'bestTimeForCurrentSize',
      minBoardSize: 'minBoardSize',
      secondsUntilNextFree: 'secondsUntilNextFree',
    }),
    fieldCssVars () {
      const base = 80
      const min = 25
      const size = Math.max(min, base - (this.boardSize - 4) * 5)
      const font = Math.max(10, 28 - (this.boardSize - 4) * 2)

      return {
        '--puzzle-cols': String(this.boardSize),
        '--puzzle-rows': String(this.boardSize),
        '--puzzle-tile-w': `${size}px`,
        '--puzzle-tile-h': `${size}px`,
        '--puzzle-tile-font': `${font}px`,
      }
    },
    formattedElapsed () {
      return (
        this.formatSeconds(this.elapsedSeconds)
      )
    },
    recordsList () {
      const keys = Object.keys(this.records).sort((a, b) => {
        return Number(a) - Number(b)
      })

      return keys.map((k) => {
        return {
          key: k,
          label: `${k}×${k}: ${this.formatSeconds(this.records[k])}`,
        }
      })
    },
  },
  mounted () {
    this.initGame()
    this.timerId = setInterval(() => {
      this.tickSecond()
    }, 1000)
  },
  beforeUnmount () {
    if (this.timerId !== null) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  },
  methods: {
    ...mapActions('puzzle', [
      'initGame',
      'resetGame',
      'resizeBoardDelta',
      'setRandomBlockMode',
      'setFreezeMode',
      'tryMoveTile',
      'tickSecond',
      'recordMove',
    ]),
    formatSeconds (totalSeconds) {
      const s = Math.max(0, Math.floor(Number(totalSeconds)))
      const m = Math.floor(s / 60)
      const sec = s % 60
      const mm = String(m).padStart(2, '0')
      const ss = String(sec).padStart(2, '0')

      return `${mm}:${ss}`
    },
    tileIsDisabled (pos) {
      if (!this.randomBlockMode) {
        return false
      }

      if (this.blockedPosition !== pos) {
        return false
      }

      return this.freeMoveTokens <= 0
    },
    onTileTap (pos) {
      this.tryMoveTile(pos)
    },
    onRandomBlockChange (event) {
      if (!event || !event.target) {
        return
      }
      const checked = event.target.checked
      this.setRandomBlockMode(checked)
    },
    onFreezeModeChange (event) {
      if (!event || !event.target) {
        return
      }
      const checked = event.target.checked
      this.setFreezeMode(checked)
    },
    handleTouchStart (event) {
      this.touchStartX = event.touches[0].clientX
      this.touchStartY = event.touches[0].clientY
    },
    handleTouchEnd (event) {
      const touchEndX = event.changedTouches[0].clientX
      const touchEndY = event.changedTouches[0].clientY

      const dx = touchEndX - this.touchStartX
      const dy = touchEndY - this.touchStartY

      const voidPos = this.tileArray.find((t) => t.isVoid).pos
      const row = Math.floor(voidPos / this.boardSize)
      const col = voidPos % this.boardSize

      let targetPos = -1

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && col < this.boardSize - 1) {
          targetPos = voidPos + 1
        }
        if (dx < 0 && col > 0) {
          targetPos = voidPos - 1
        }
      } else {
        if (dy > 0 && row < this.boardSize - 1) {
          targetPos = voidPos + this.boardSize
        }
        if (dy < 0 && row > 0) {
          targetPos = voidPos - this.boardSize
        }
      }

      if (targetPos !== -1) {
        this.tryMoveTile(targetPos)
      }
    },
  },
})

export default IndexPage
</script>

<style scoped lang="scss">
.game-area {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0d47a1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  box-sizing: border-box;

  @media (max-width: 500px) {
    padding: 15px;
  }

  &__content {
    text-align: center;
    width: 100%;
    max-width: 100%;
  }

  &__title {
    color: #fff;
    font-size: 32px;
    margin: 0 0 20px 0;
    font-family: sans-serif;

    @media (max-width: 500px) {
      font-size: 28px;
    }

    @media (max-width: 350px) {
      font-size: 24px;
    }
  }

  &__stats {
    color: #64b5f6;
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 12px;
    font-family: sans-serif;

    @media (max-width: 500px) {
      font-size: 16px;
    }

    &--timer {
      color: #fff59d;
    }

    &--free {
      color: #ffcc80;
      font-size: 16px;
      font-weight: normal;
    }

    &--next-free {
      color: #ce93d8;
      font-size: 15px;
      font-weight: normal;
    }

    &--fast {
      color: #ff5252;
      animation: pulse 0.5s infinite;
    }
  }

  &__mode {
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }

  &__mode-label {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: #e3f2fd;
    font-family: sans-serif;
    font-size: 15px;
    cursor: pointer;
    user-select: none;
  }

  &__mode-input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  &__mode-text {
    text-align: left;
  }

  &__records {
    margin-bottom: 16px;
    color: #b3e5fc;
    font-family: sans-serif;
    font-size: 14px;
  }

  &__records-title {
    font-weight: bold;
    margin-bottom: 6px;
    color: #e1f5fe;
  }

  &__records-best {
    margin-bottom: 8px;
  }

  &__records-list {
    list-style: none;
    padding: 0;
    margin: 0 auto;
    max-width: 280px;
    text-align: left;
  }

  &__records-item {
    padding: 2px 0;
  }

  &__message {
    color: #81c784;
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 15px;
  }

  &__field {
    display: inline-grid;
    grid-template-columns: repeat(var(--puzzle-cols, 4), var(--puzzle-tile-w, 80px));
    grid-template-rows: repeat(var(--puzzle-rows, 4), var(--puzzle-tile-h, 80px));
    gap: 3px;
    margin: 0 auto 30px;
    background-color: #1565c0;
    padding: 3px;
    border-radius: 8px;
    touch-action: none;
  }

  &__controls {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
  }

  &__btn {
    padding: 12px 20px;
    font-size: 18px;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-family: sans-serif;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 500px) {
      padding: 10px 30px;
      font-size: 14px;
    }

    &--reset {
      padding: 12px 40px;
      font-size: 16px;
      background-color: #1976d2;
    }

    &--minus {
      background-color: #0d47a1;
    }

    &--plus {
      background-color: #0d47a1;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}
</style>
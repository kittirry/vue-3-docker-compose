<template>
  <div
      class="game-area__tile"
      :class="tileClasses"
      @click="() => handleClick()"
  >
    <span v-if="!isVoid">{{ num }}</span>
    <span v-if="isDisabled && !isVoid" class="game-area__tile-lock">🔒</span>
    <span v-if="isFrozen && !isVoid" class="game-area__tile-ice">❄️</span>
  </div>
</template>

<script>
import { defineComponent } from 'vue'

const PuzzleTile = defineComponent({
  name: 'PuzzleTile',
  props: {
    num: {
      type: Number,
      required: true,
    },
    isVoid: {
      type: Boolean,
      default: false,
    },
    finished: {
      type: Boolean,
      default: false,
    },
    isDisabled: {
      type: Boolean,
      default: false,
    },
    isFrozen: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click'],
  computed: {
    tileClasses () {
      return {
        'game-area__tile--empty': this.isVoid,
        'game-area__tile--complete': this.finished,
        'game-area__tile--blocked': this.isDisabled,
        'game-area__tile--frozen': this.isFrozen,
      }
    },
  },
  methods: {
    handleClick () {
      if (this.isVoid || this.isDisabled || this.isFrozen) {
        return
      }

      this.$emit('click')
    },
  },
})

export default PuzzleTile
</script>

<style scoped lang="scss">
.game-area__tile {
  width: 100%;
  height: 100%;
  font-size: var(--puzzle-tile-font, 28px);
  background-color: #1976d2;
  color: #fff;
  font-weight: bold;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: sans-serif;
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s ease, background-color 0.2s ease;
  box-sizing: border-box;
  position: relative;

  &:active {
    transform: scale(0.95);
    background-color: #42a5f5;
  }

  &--empty {
    background-color: transparent;
    cursor: default;
  }

  &--complete {
    background-color: #81c784;
    color: #000;
  }

  &--blocked {
    background-color: #ef5350;
    cursor: not-allowed;
    opacity: 0.8;

    &:active {
      transform: none;
    }
  }

  &--frozen {
    background-color: #4dd0e1;
    cursor: not-allowed;
    opacity: 0.9;

    &:active {
      transform: none;
    }
  }

  &-lock {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 14px;
    pointer-events: none;
  }

  &-ice {
    position: absolute;
    top: 2px;
    right: 2px;
    font-size: 14px;
    pointer-events: none;
  }
}
</style>
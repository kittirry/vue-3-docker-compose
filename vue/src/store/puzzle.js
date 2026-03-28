import { FREE_MOVE_INTERVAL_SECONDS } from '@/constants/puzzleGame.js'
import { STORAGE_KEY_PUZZLE_RECORDS } from '@/constants/puzzleStorage.js'

const MUTATIONS = {
  SET_GRID_DATA: 'SET_GRID_DATA',
  SET_BOARD_SIZE: 'SET_BOARD_SIZE',
  SET_STEP_COUNT: 'SET_STEP_COUNT',
  SET_RANDOM_BLOCK_MODE: 'SET_RANDOM_BLOCK_MODE',
  SET_BLOCKED_POSITION: 'SET_BLOCKED_POSITION',
  SET_ELAPSED_SECONDS: 'SET_ELAPSED_SECONDS',
  SET_FREE_MOVE_TOKENS: 'SET_FREE_MOVE_TOKENS',
  SET_FREE_MOVE_TICK: 'SET_FREE_MOVE_TICK',
  SET_GAME_COMPLETED: 'SET_GAME_COMPLETED',
  SET_RECORDS: 'SET_RECORDS',
}

const minBoardSize = 3

const createSolvedGrid = (size) => {
  const total = size * size

  return Array.from(
      { length: total },
      (_, i) => {
        return (i + 1) % total
      }
  )
}

const getAdjacent = (state, pos) => {
  const result = []
  const row = Math.floor(pos / state.boardSize)
  const col = pos % state.boardSize

  if (row > 0) {
    result.push(pos - state.boardSize)
  }

  if (row < state.boardSize - 1) {
    result.push(pos + state.boardSize)
  }

  if (col > 0) {
    result.push(pos - 1)
  }

  if (col < state.boardSize - 1) {
    result.push(pos + 1)
  }

  return result
}

const validateWin = (state) => {
  const total = state.boardSize * state.boardSize

  for (let i = 0; i < total; i++) {
    const target = (i < total - 1)
        ? (i + 1)
        : 0

    if (state.gridData[i] !== target) {
      return false
    }
  }

  return true
}

const pickRandomBlockedNeighbor = (state, voidPos) => {
  const adj = getAdjacent(state, voidPos)

  if (adj.length === 0) {
    return null
  }

  const idx = Math.floor(Math.random() * adj.length)

  return adj[idx]
}

export default {
  namespaced: true,

  state () {
    return {
      boardSize: 4,
      gridData: [],
      stepCount: 0,
      randomBlockMode: false,
      blockedPosition: null,
      elapsedSeconds: 0,
      freeMoveTokens: 0,
      freeMoveTick: 0,
      gameCompleted: false,
      records: {},
    }
  },

  getters: {
    minBoardSize: () => {
      return minBoardSize
    },

    tileArray: (state) => {
      return state.gridData.map((val, idx) => {
        return {
          pos: idx,
          num: val,
          isVoid: val === 0,
        }
      })
    },

    isWin: (state) => {
      if (!state.gridData.length) {
        return false
      }

      return validateWin(state)
    },

    bestTimeForCurrentSize: (state) => {
      const key = String(state.boardSize)
      const v = state.records[key]

      if (v === undefined || v === null) {
        return null
      }

      return v
    },

    secondsUntilNextFree: (state, getters) => {
      if (state.gameCompleted) {
        return null
      }

      if (!state.gridData.length) {
        return null
      }

      if (getters.isWin) {
        return null
      }

      return FREE_MOVE_INTERVAL_SECONDS - state.freeMoveTick
    },
  },

  mutations: {
    [MUTATIONS.SET_GRID_DATA]: (state, payload) => {
      state.gridData = payload
    },

    [MUTATIONS.SET_BOARD_SIZE]: (state, payload) => {
      state.boardSize = payload
    },

    [MUTATIONS.SET_STEP_COUNT]: (state, payload) => {
      state.stepCount = payload
    },

    [MUTATIONS.SET_RANDOM_BLOCK_MODE]: (state, payload) => {
      state.randomBlockMode = payload
    },

    [MUTATIONS.SET_BLOCKED_POSITION]: (state, payload) => {
      state.blockedPosition = payload
    },

    [MUTATIONS.SET_ELAPSED_SECONDS]: (state, payload) => {
      state.elapsedSeconds = payload
    },

    [MUTATIONS.SET_FREE_MOVE_TOKENS]: (state, payload) => {
      state.freeMoveTokens = payload
    },

    [MUTATIONS.SET_FREE_MOVE_TICK]: (state, payload) => {
      state.freeMoveTick = payload
    },

    [MUTATIONS.SET_GAME_COMPLETED]: (state, payload) => {
      state.gameCompleted = payload
    },

    [MUTATIONS.SET_RECORDS]: (state, payload) => {
      state.records = { ...payload }
    },
  },

  actions: {
    loadRecordsFromStorage ({ commit }) {
      let raw = null

      try {
        raw = window.localStorage.getItem(STORAGE_KEY_PUZZLE_RECORDS)
      } catch (e) {
        raw = null
      }

      if (!raw) {
        commit(MUTATIONS.SET_RECORDS, {})

        return
      }

      let parsed = null

      try {
        parsed = JSON.parse(raw)
      } catch (e) {
        parsed = {}
      }

      if (!parsed || typeof parsed !== 'object') {
        commit(MUTATIONS.SET_RECORDS, {})

        return
      }

      commit(MUTATIONS.SET_RECORDS, parsed)
    },

    persistRecords ({ state }) {
      try {
        window.localStorage.setItem(
            STORAGE_KEY_PUZZLE_RECORDS,
            JSON.stringify(state.records)
        )
      } catch (e) {
        return
      }
    },

    saveBestTimeIfNeeded ({ state, dispatch, commit, getters }) {
      if (!getters.isWin) {
        return
      }

      const key = String(state.boardSize)
      const prev = state.records[key]
      const t = state.elapsedSeconds

      if (prev !== undefined && prev !== null && t >= prev) {
        return
      }

      const next = { ...state.records, [key]: t }

      commit(MUTATIONS.SET_RECORDS, next)
      dispatch('persistRecords')
    },

    rollBlockedNeighbor ({ state, commit }) {
      if (!state.randomBlockMode) {
        commit(MUTATIONS.SET_BLOCKED_POSITION, null)

        return
      }

      const voidPos = state.gridData.indexOf(0)
      const blocked = pickRandomBlockedNeighbor(state, voidPos)

      commit(MUTATIONS.SET_BLOCKED_POSITION, blocked)
    },

    switchCells ({ state, commit }, { p1, p2 }) {
      const next = state.gridData.slice()
      const buffer = next[p1]

      next[p1] = next[p2]
      next[p2] = buffer
      commit(MUTATIONS.SET_GRID_DATA, next)
    },

    mixBoard ({ state, dispatch }) {
      let lastPos = -1
      const mixSteps = state.boardSize * state.boardSize * 10

      for (let i = 0; i < mixSteps; i++) {
        const voidPos = state.gridData.indexOf(0)
        const adj = getAdjacent(state, voidPos)
        const allowed = adj.filter((n) => {
          return n !== lastPos
        })

        if (allowed.length === 0) {
          break
        }

        const chosen = allowed[Math.floor(Math.random() * allowed.length)]

        dispatch('switchCells', { p1: voidPos, p2: chosen })
        lastPos = voidPos
      }
    },

    resetGame ({ state, commit, dispatch }) {
      commit(MUTATIONS.SET_STEP_COUNT, 0)
      commit(MUTATIONS.SET_ELAPSED_SECONDS, 0)
      commit(MUTATIONS.SET_FREE_MOVE_TOKENS, 0)
      commit(MUTATIONS.SET_FREE_MOVE_TICK, 0)
      commit(MUTATIONS.SET_GAME_COMPLETED, false)
      commit(MUTATIONS.SET_GRID_DATA, createSolvedGrid(state.boardSize))
      dispatch('mixBoard')
      dispatch('rollBlockedNeighbor')
    },

    initGame ({ dispatch }) {
      dispatch('loadRecordsFromStorage')
      dispatch('resetGame')
    },

    setBoardSize ({ commit, dispatch }, nextSize) {
      if (nextSize < minBoardSize) {
        return
      }

      commit(MUTATIONS.SET_BOARD_SIZE, nextSize)
      dispatch('resetGame')
    },

    setRandomBlockMode ({ commit, dispatch }, value) {
      commit(MUTATIONS.SET_RANDOM_BLOCK_MODE, value)
      dispatch('rollBlockedNeighbor')
    },

    tickSecond ({ state, commit, getters }) {
      if (state.gameCompleted) {
        return
      }

      if (getters.isWin) {
        return
      }

      commit(MUTATIONS.SET_ELAPSED_SECONDS, state.elapsedSeconds + 1)

      const nextTick = state.freeMoveTick + 1

      if (nextTick >= FREE_MOVE_INTERVAL_SECONDS) {
        commit(MUTATIONS.SET_FREE_MOVE_TOKENS, state.freeMoveTokens + 1)
        commit(
            MUTATIONS.SET_FREE_MOVE_TICK,
            nextTick - FREE_MOVE_INTERVAL_SECONDS
        )
      } else {
        commit(MUTATIONS.SET_FREE_MOVE_TICK, nextTick)
      }
    },

    tryMoveTile ({ state, getters, dispatch }, pos) {
      if (state.gameCompleted || getters.isWin) {
        return
      }

      const voidPos = state.gridData.indexOf(0)

      if (pos === voidPos) {
        return
      }

      const adj = getAdjacent(state, voidPos)
      const isAdjacent = adj.includes(pos)
      const isBlockedNeighbor = state.randomBlockMode && state.blockedPosition === pos

      if (isAdjacent && !isBlockedNeighbor) {
        dispatch('applyMove', { voidPos, pos, useFreeToken: false })

        return
      }

      if (state.freeMoveTokens <= 0) {
        return
      }

      dispatch('applyMove', { voidPos, pos, useFreeToken: true })
    },

    applyMove ({ state, dispatch, commit, getters }, { voidPos, pos, useFreeToken }) {
      dispatch('switchCells', { p1: voidPos, p2: pos })
      commit(MUTATIONS.SET_STEP_COUNT, state.stepCount + 1)

      if (useFreeToken) {
        commit(MUTATIONS.SET_FREE_MOVE_TOKENS, Math.max(0, state.freeMoveTokens - 1))
      }

      dispatch('rollBlockedNeighbor')

      if (getters.isWin) {
        commit(MUTATIONS.SET_GAME_COMPLETED, true)
        dispatch('saveBestTimeIfNeeded')
      }
    },

    resizeBoardDelta ({ state, dispatch }, delta) {
      const next = state.boardSize + delta

      dispatch('setBoardSize', next)
    },
  },
}

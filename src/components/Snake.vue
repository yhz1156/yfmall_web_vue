<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// 游戏配置
const GRID_SIZE = 20
const GAME_SPEED = 100

// 游戏状态
const score = ref(0)
const gameOver = ref(false)
const direction = ref('right')
const food = ref({ x: 5, y: 5 })
const snake = ref([
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
])

// 生成随机食物位置
const generateFood = () => {
  const x = Math.floor(Math.random() * GRID_SIZE)
  const y = Math.floor(Math.random() * GRID_SIZE)
  food.value = { x, y }
}

// 检查碰撞
const checkCollision = (head) => {
  // 检查墙壁碰撞
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true
  }
  // 检查自身碰撞
  return snake.value.slice(1).some(segment => segment.x === head.x && segment.y === head.y)
}

// 移动蛇
const moveSnake = () => {
  if (gameOver.value) return

  const head = { ...snake.value[0] }

  switch (direction.value) {
    case 'up': head.y--; break
    case 'down': head.y++; break
    case 'left': head.x--; break
    case 'right': head.x++; break
  }

  if (checkCollision(head)) {
    gameOver.value = true
    return
  }

  snake.value.unshift(head)

  // 检查是否吃到食物
  if (head.x === food.value.x && head.y === food.value.y) {
    score.value += 10
    generateFood()
  } else {
    snake.value.pop()
  }
}

// 处理键盘事件
const handleKeydown = (e) => {
  switch (e.key.toLowerCase()) {
    case 'arrowup':
    case 'w':
      if (direction.value !== 'down') direction.value = 'up'
      break
    case 'arrowdown':
    case 's':
      if (direction.value !== 'up') direction.value = 'down'
      break
    case 'arrowleft':
    case 'a':
      if (direction.value !== 'right') direction.value = 'left'
      break
    case 'arrowright':
    case 'd':
      if (direction.value !== 'left') direction.value = 'right'
      break
    case 'enter':
      if (gameOver.value) restartGame()
      break
  }
}

// 重启游戏
const restartGame = () => {
  snake.value = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]
  direction.value = 'right'
  score.value = 0
  gameOver.value = false
  generateFood()
}

// 游戏循环
let gameInterval
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  gameInterval = setInterval(moveSnake, GAME_SPEED)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  clearInterval(gameInterval)
})
</script>

<template>
  <el-card class="game-container">
    <template #header>
      <div class="game-header">
        <h2>贪吃蛇游戏</h2>
        <el-tag size="large" type="success" class="score">得分: {{ score }}</el-tag>
      </div>
    </template>
    
    <div class="game-grid" :class="{ 'game-over': gameOver }">
      <div v-for="y in GRID_SIZE" :key="y" class="row">
        <div v-for="x in GRID_SIZE" :key="x" class="cell"
          :class="{
            'snake': snake.some(segment => segment.x === x-1 && segment.y === y-1),
            'food': food.x === x-1 && food.y === y-1
          }">
        </div>
      </div>
    </div>

    <el-alert
      v-if="gameOver"
      title="游戏结束！按Enter键重新开始"
      type="error"
      :closable="false"
      center
      class="game-over-message"
    />
  </el-card>
</template>

<style scoped>
.game-container {
  max-width: 600px;
  margin: 0 auto;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score {
  font-size: 1.2em;
}

.game-grid {
  display: grid;
  grid-template-rows: repeat(20, 20px);
  gap: 1px;
  background-color: #2c3e50;
  padding: 10px;
  border-radius: 8px;
  margin: 20px 0;
}

.row {
  display: grid;
  grid-template-columns: repeat(20, 20px);
  gap: 1px;
}

.cell {
  width: 20px;
  height: 20px;
  background-color: #34495e;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.snake {
  background-color: #42b883;
  border-radius: 4px;
}

.food {
  background-color: #e74c3c;
  border-radius: 50%;
}

.game-over .snake {
  background-color: #e74c3c;
}

.game-over-message {
  margin-top: 20px;
}
</style>
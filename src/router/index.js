import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import PuzzlesResolve001View from '../views/puzzles/Resolve001View.vue'
import PuzzlesResolve002View from '../views/puzzles/Resolve002View.vue'
import PuzzlesResolve003View from '../views/puzzles/Resolve003View.vue'
import PuzzlesResolve004View from '../views/puzzles/Resolve004View.vue'
import PuzzlesResolve005View from '../views/puzzles/Resolve005View.vue'
import PuzzlesResolve006View from '../views/puzzles/Resolve006View.vue'
import PuzzlesResolve007View from '../views/puzzles/Resolve007View.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/puzzles/resolve-001',
    name: 'puzzles-resolve-001',
    component: PuzzlesResolve001View
  },
  {
    path: '/puzzles/resolve-002',
    name: 'puzzles-resolve-002',
    component: PuzzlesResolve002View
  },
  {
    path: '/puzzles/resolve-003',
    name: 'puzzles-resolve-003',
    component: PuzzlesResolve003View
  },
  {
    path: '/puzzles/resolve-004',
    name: 'puzzles-resolve-004',
    component: PuzzlesResolve004View
  },
  {
    path: '/puzzles/resolve-005',
    name: 'puzzles-resolve-005',
    component: PuzzlesResolve005View
  },
  {
    path: '/puzzles/resolve-006',
    name: 'puzzles-resolve-006',
    component: PuzzlesResolve006View
  },
  {
    path: '/puzzles/resolve-007',
    name: 'puzzles-resolve-007',
    component: PuzzlesResolve007View
  },
  {
    path: '/about',
    name: 'about',
    component: function () {
      return import(
        /* webpackChunkName: "about" */
        '../views/AboutView.vue'
      )
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router

<template>
  <nav>
    <router-link to="/">Home</router-link>
     | <router-link to="/about">About</router-link>
     | <router-link to="/puzzles/resolve-001">R.Puzzle 1</router-link>
     | <router-link to="/puzzles/resolve-002">R.Puzzle 2</router-link>
     | <router-link to="/puzzles/resolve-003">R.Puzzle 3</router-link>
     | <router-link to="/puzzles/resolve-004">R.Puzzle 4</router-link>
     | <router-link to="/puzzles/resolve-005">R.Puzzle 5</router-link>
     | <router-link to="/puzzles/resolve-006">R.Puzzle 6</router-link>
     | <router-link to="/puzzles/resolve-007">R.Puzzle 7</router-link>
  </nav>
  <router-view/>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>

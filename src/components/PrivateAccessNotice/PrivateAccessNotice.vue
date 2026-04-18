<template>
  <section class="private-access-notice panel-card">
    <p class="private-access-notice__eyebrow">Private Network Only</p>
    <h1>当前网页无法访问</h1>
    <p class="private-access-notice__copy">请连接 Tailscale 后重试。</p>
  </section>
</template>

<style scoped>
.private-access-notice {
  width: min(520px, 100%);
  margin: 0 auto;
  padding: 38px 32px;
  border-radius: 28px;
  text-align: center;
}

.private-access-notice__eyebrow {
  margin: 0 0 12px;
  color: #2a8cd9;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.private-access-notice h1 {
  margin: 0;
  color: #163a55;
  font-size: clamp(2rem, 4vw, 2.6rem);
  line-height: 1.08;
}

.private-access-notice__copy {
  margin: 14px 0 0;
  color: #52728d;
  font-size: 1rem;
}
</style>

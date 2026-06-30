
const app = require('./index');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n✈  Book My Flight server running on http://localhost:${PORT}`);
  console.log(`   Admin login → username: admin  |  password: bmf@2026`);
  console.log(`   Auth cookies: bmf_admin / bmf_user (httpOnly, 2h expiry)\n`);
});

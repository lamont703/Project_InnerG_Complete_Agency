const fs = require('fs');
const raw = {
  "success": true,
  "statusCode": 200,
  "message": "Fetched Accounts",
  "results": {
    "accounts": [
      {"id": "69211644e1ea9f528eb585f7_QLyYYRoOhCg65lKW9HDX_hd1PfCiHkw_profile"},
      {"id": "68fd8cc7f33ef35341a6e0d1_QLyYYRoOhCg65lKW9HDX_0007Gosi9mkCcK6aJbyqWem8Wq9A687CQv_business"},
      {"id": "65c303dfab7f1122c85e6603_QLyYYRoOhCg65lKW9HDX_0001O1glKcSjii61bjKC8t81SMEVrrafv_business"},
      {"id": "691b5bafd9da6e68bcb04302_QLyYYRoOhCg65lKW9HDX_UC2R_pYoza1bxm-iOhWtO6AA_profile"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694744317b12d6d63171b615"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c1e17b12d6d6315184d1"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694710b57b12d6d6312dbb0e"},
      {"id": "6930620cbbc1280e43816421_QLyYYRoOhCg65lKW9HDX_6928d236fe50fd8d02415f7c"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694748e27b12d6d6317716ce"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c4967b12d6d63154a6cc"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c277bb5fdfb631891051"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694748eb7b12d6d6317723ec"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_69474291bb5fdfb631a79c4b"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694741b4bb5fdfb631a68f39"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_694744bf7b12d6d631724cbc"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c300bb5fdfb63189ae5e"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c103bb5fdfb631872b69"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6948c17b7b12d6d63150f0be"},
      {"id": "6948c83b45762b11c16e170c_QLyYYRoOhCg65lKW9HDX_6947435b7b12d6d63170abb8"}
    ]
  }
};
const ids = raw.results.accounts.map(a => a.id).join(',');
fs.appendFileSync('.env.local', `\nGHL_SOCIAL_ACCOUNTS="${ids}"\n`);
console.log('Appended to .env.local!');

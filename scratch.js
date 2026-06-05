const phone = "(123) 456-7890";
const digits = phone.replace(/\D/g, '').slice(-10);
console.log(digits);
const likePattern = '%' + digits.split('').join('%') + '%';
console.log(likePattern);

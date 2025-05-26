const prefixes = [
  {
    pow: 9,
    prefix: 'G',
  },
  {
    pow: 6,
    prefix: 'M',
  },
  {
    pow: 3,
    prefix: 'K',
  },
  {
    pow: 0,
    prefix: '',
  },
];

module.exports = (size) => {
  const p = [...prefixes].sort().find(({ pow }) => {
    if ((size / (10 ** pow)) > 1) {
      return true;
    }

    return false;
  });

  const divideBy = 10 ** p.pow;

  if (divideBy === 1) {
    return `${Math.round(size / divideBy)} ${p.prefix}B`;
  }

  return `${Math.round((size / divideBy) * 100) / 100} ${p.prefix}B`;
};

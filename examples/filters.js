const { render_strict, Template } = require('..');

// Template.register_filter('append', append);
Template.register_filter('map', (data, params) => {
  return data.map(item => ({ [params.label]: item[params.value] }));
});

(async () => {

  const actual = await render_strict('{% assign options = steps.fetch_labels.records | map: "value"=id, "label"=name %}', {
    steps: {
      fetch_labels: {
        records: [
          { id: 1, name: 'doowb' },
          { id: 2, name: 'jonschlinkert' },
          { id: 3, name: 'foo' },
          { id: 4, name: 'bar' },
          { id: 5, name: 'baz' }
        ]
      }
    }
  }, {
    output: { type: 'array' }
  });

  console.log({
    expected: '<doowb>',
    actual
  });
  console.log(actual);

  console.log({
    expected: '<doowb>',
    actual: await render_strict('{{ steps.fetch_labels.records | map: "value"=id, "label"=name }}', {
      steps: {
        fetch_labels: {
          records: [
            { id: 1, name: 'doowb' },
            { id: 2, name: 'jonschlinkert' },
            { id: 3, name: 'foo' },
            { id: 4, name: 'bar' },
            { id: 5, name: 'baz' }
          ]
        }
      }
    }, {
      output: { type: 'array' }
    })
  });

})();

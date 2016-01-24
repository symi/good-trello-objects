function createEnum(props) {
    const obj = {};
    
    props.forEach((v, i) => {
        obj[obj[v] = i] = v;
    });
    
    return obj;
}

module.exports = createEnum;
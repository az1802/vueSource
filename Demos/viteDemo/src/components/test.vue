<template>
    <div @click="addCount">
       count----- {{count}}
    </div>
</template>
<script>
import {h,ref, watchEffect,unref} from "vue"
// export default {
//     setup(){
//         let count = ref(1);
//         watchEffect(()=>{
//             console.log(count.value)
//         })
//         function addCount(){

//            let val = unref(count);
//            console.log(val);
//         }
//         return {
//             count,
//             addCount
//         }
//     }

// }
export default function(){
     let count = ref(1);
        watchEffect(()=>{
            console.log(count.value)
        })
        function addCount(){

           let val = unref(count);
           console.log(val);
        }
        // return {
        //     count,
        //     addCount
        // }
        return h("div","aaa")
}
</script>
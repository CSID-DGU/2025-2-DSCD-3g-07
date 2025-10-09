if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/3cefa1ac864c6b2d83e4f85211b38ee6/transformed/hermes-android-0.81.4-debug/prefab/modules/libhermes/libs/android.armeabi-v7a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/3cefa1ac864c6b2d83e4f85211b38ee6/transformed/hermes-android-0.81.4-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


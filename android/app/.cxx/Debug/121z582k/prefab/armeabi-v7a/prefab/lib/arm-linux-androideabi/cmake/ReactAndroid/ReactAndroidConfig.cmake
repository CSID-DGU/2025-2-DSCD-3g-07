if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/hermestooling/libs/android.armeabi-v7a/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/jsi/libs/android.armeabi-v7a/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/reactnative/libs/android.armeabi-v7a/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/ntoh2/.gradle/caches/8.14.3/transforms/673a27f53479c4bbce3e2bb096fa9438/transformed/react-android-0.81.4-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()


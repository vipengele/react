---
name: ui-token-reads-carry-no-fallback
kind: invariant
description: No var(--vpg-*) read in the ui package's src has a literal fallback; a glob-driven test enforces it, including in components that do not exist yet.
anchors:
  - path: source/react-ui/packages/ui/src/*/*.ts
    matches:
      - path: source/react-ui/packages/ui/src/Accordion/Accordion.stylesheet.ts
        blob: 43190f598cbc
      - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.stylesheet.ts
        blob: 418399b3be68
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.stylesheet.ts
        blob: 86115d9cab83
      - path: source/react-ui/packages/ui/src/Badge/Badge.stylesheet.ts
        blob: 2e519b87b734
      - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.stylesheet.ts
        blob: bc5fe171d22b
      - path: source/react-ui/packages/ui/src/Button/Button.stylesheet.ts
        blob: dbc2f3152825
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.stylesheet.ts
        blob: ff80e6d4da93
      - path: source/react-ui/packages/ui/src/Card/Card.stylesheet.ts
        blob: 6f1685d3df13
      - path: source/react-ui/packages/ui/src/Center/Center.stylesheet.ts
        blob: be28a3b5dabc
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.stylesheet.ts
        blob: a10631e08c15
      - path: source/react-ui/packages/ui/src/ContextMenu/useContextMenuTriggers.ts
        blob: 667954cd817c
      - path: source/react-ui/packages/ui/src/Dialog/Dialog.stylesheet.ts
        blob: 30f382d129a3
      - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.stylesheet.ts
        blob: cd07afbebe4c
      - path: source/react-ui/packages/ui/src/Drawer/Drawer.stylesheet.ts
        blob: 9a80b02a45e0
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
        blob: f5332bcc4633
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.stylesheet.ts
        blob: fe96778bf3c1
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
        blob: cd03cfd90664
      - path: source/react-ui/packages/ui/src/FileInput/FileInput.stylesheet.ts
        blob: 341e9104cd7d
      - path: source/react-ui/packages/ui/src/FileInput/acceptFile.test.ts
        blob: 87dfd93b9cfb
      - path: source/react-ui/packages/ui/src/FileInput/acceptFile.ts
        blob: 6666024da4bb
      - path: source/react-ui/packages/ui/src/FileInput/useFileDrop.ts
        blob: ea53f4597fe4
      - path: source/react-ui/packages/ui/src/FileInput/useFileUploads.ts
        blob: a104c247d314
      - path: source/react-ui/packages/ui/src/FileInput/useForwardedRef.ts
        blob: 7882d2e1784a
      - path: source/react-ui/packages/ui/src/FormField/FormField.stylesheet.ts
        blob: 5d9dc9ea4e45
      - path: source/react-ui/packages/ui/src/Grid/Grid.stylesheet.ts
        blob: b3a0c8ebf478
      - path: source/react-ui/packages/ui/src/Inline/Inline.stylesheet.ts
        blob: 2e8555855f1a
      - path: source/react-ui/packages/ui/src/Link/Link.stylesheet.ts
        blob: f34512c86137
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.stylesheet.ts
        blob: 10cfc4eeff0c
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.stylesheet.ts
        blob: 84968849c503
      - path: source/react-ui/packages/ui/src/Pagination/pageWindow.test.ts
        blob: 303d76802553
      - path: source/react-ui/packages/ui/src/Pagination/pageWindow.ts
        blob: ab6165b02228
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
        blob: f9a312d6f430
      - path: source/react-ui/packages/ui/src/Popover/Popover.stylesheet.ts
        blob: 0edbbd2c5f1b
      - path: source/react-ui/packages/ui/src/Progress/Progress.stylesheet.ts
        blob: 62bd6f8460ed
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.stylesheet.ts
        blob: 9f82d130da5d
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.stylesheet.ts
        blob: 2e3e29cea33f
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.stylesheet.ts
        blob: 02577b9bbb3b
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.stylesheet.ts
        blob: 2470549cc7c9
      - path: source/react-ui/packages/ui/src/SideNav/sideNavContext.ts
        blob: 9998978a04f2
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.stylesheet.ts
        blob: d23d9836c3e2
      - path: source/react-ui/packages/ui/src/Slider/Slider.stylesheet.ts
        blob: 4e827709d87c
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.stylesheet.ts
        blob: 6ac87edea672
      - path: source/react-ui/packages/ui/src/Stack/Stack.stylesheet.ts
        blob: fc8e72b9343a
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts
        blob: 426e7bca31ad
      - path: source/react-ui/packages/ui/src/Table/Table.stylesheet.ts
        blob: c6b89ad4f9cb
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.stylesheet.ts
        blob: 7a3c8dc3fdc0
      - path: source/react-ui/packages/ui/src/Tag/Tag.stylesheet.ts
        blob: 263fa74cff1e
      - path: source/react-ui/packages/ui/src/TextField/TextField.stylesheet.ts
        blob: 7b634f614251
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.stylesheet.ts
        blob: 1cd7c2f65099
      - path: source/react-ui/packages/ui/src/Toast/Toast.stylesheet.ts
        blob: a02bad662323
      - path: source/react-ui/packages/ui/src/Toast/toaster.test.ts
        blob: 8aa9c47b4272
      - path: source/react-ui/packages/ui/src/Toast/toaster.ts
        blob: 663f13c686cf
      - path: source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.ts
        blob: cc6413b6998d
      - path: source/react-ui/packages/ui/src/Toast/useSwipeDismiss.ts
        blob: df62c61a1fbb
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.stylesheet.ts
        blob: 107e95f491f0
      - path: source/react-ui/packages/ui/src/Toolbar/Toolbar.stylesheet.ts
        blob: 8cec624e1675
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.stylesheet.ts
        blob: 33be265cfab9
      - path: source/react-ui/packages/ui/src/Tree/Tree.stylesheet.ts
        blob: 414b3af3fd02
      - path: source/react-ui/packages/ui/src/Tree/flatten.test.ts
        blob: c8298d336019
      - path: source/react-ui/packages/ui/src/Tree/flatten.ts
        blob: da86d3034a4f
      - path: source/react-ui/packages/ui/src/Tree/keyboard.ts
        blob: 12eea4b772a5
      - path: source/react-ui/packages/ui/src/Tree/navigation.ts
        blob: 7589c0a3e0cf
      - path: source/react-ui/packages/ui/src/Tree/rowState.ts
        blob: a0d9e2a8a53b
      - path: source/react-ui/packages/ui/src/Tree/useTreeFocus.ts
        blob: 44dfd9dccfa9
      - path: source/react-ui/packages/ui/src/Tree/useTypeAhead.ts
        blob: 437b16f148e7
      - path: source/react-ui/packages/ui/src/Typography/Typography.stylesheet.ts
        blob: 76df2a12d3d1
      - path: source/react-ui/packages/ui/src/internal/disclosureGroup.ts
        blob: 5bd1d17f15cb
      - path: source/react-ui/packages/ui/src/internal/flexKeywords.test.ts
        blob: 82a98cb980e1
      - path: source/react-ui/packages/ui/src/internal/flexKeywords.ts
        blob: 555f29b21525
      - path: source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
        blob: b7082a9ecf1a
      - path: source/react-ui/packages/ui/src/internal/menuStylesheet.ts
        blob: f363ea26be6a
      - path: source/react-ui/packages/ui/src/internal/space.test.ts
        blob: ab6c2bb8aa5b
      - path: source/react-ui/packages/ui/src/internal/space.ts
        blob: e6402bfd4321
      - path: source/react-ui/packages/ui/src/internal/useControllableState.ts
        blob: "617526263178"
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
        blob: 43fb480e5e70
      - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
        blob: 79d4d8cd4b40
      - path: source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
        blob: 6e941c49f70a
      - path: source/react-ui/packages/ui/src/internal/useOverlayState.ts
        blob: bc34149c9907
      - path: source/react-ui/packages/ui/src/internal/useRovingFocus.ts
        blob: ce44beb4b07e
  - path: source/react-ui/packages/ui/src/*/*.tsx
    matches:
      - path: source/react-ui/packages/ui/src/Accordion/Accordion.test.tsx
        blob: 3a00e0ab7f35
      - path: source/react-ui/packages/ui/src/Accordion/Accordion.tsx
        blob: 93cfa19c43a0
      - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.browser.test.tsx
        blob: cd88c8bd4032
      - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.test.tsx
        blob: 828b1887c180
      - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.tsx
        blob: 816a42e02871
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.test.tsx
        blob: fb8e54ebaf99
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.tsx
        blob: 6b1558b6354c
      - path: source/react-ui/packages/ui/src/Badge/Badge.browser.test.tsx
        blob: bf73f37f9600
      - path: source/react-ui/packages/ui/src/Badge/Badge.test.tsx
        blob: 96ea08945def
      - path: source/react-ui/packages/ui/src/Badge/Badge.tsx
        blob: "228930664096"
      - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.browser.test.tsx
        blob: 37ca6a648a87
      - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.test.tsx
        blob: e63b2b6b9712
      - path: source/react-ui/packages/ui/src/Breadcrumbs/Breadcrumbs.tsx
        blob: fce79b13a969
      - path: source/react-ui/packages/ui/src/Button/Button.browser.test.tsx
        blob: 594f7b753b46
      - path: source/react-ui/packages/ui/src/Button/Button.test.tsx
        blob: ef56ca8c7675
      - path: source/react-ui/packages/ui/src/Button/Button.tsx
        blob: 280af1f729d3
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.test.tsx
        blob: 599a34f806ea
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.tsx
        blob: 426c90bbf1a2
      - path: source/react-ui/packages/ui/src/Card/Card.test.tsx
        blob: 0c319bfc32f9
      - path: source/react-ui/packages/ui/src/Card/Card.tsx
        blob: e5a1b5d75b1e
      - path: source/react-ui/packages/ui/src/Center/Center.browser.test.tsx
        blob: 9337c12fd845
      - path: source/react-ui/packages/ui/src/Center/Center.test.tsx
        blob: 2127f354d542
      - path: source/react-ui/packages/ui/src/Center/Center.tsx
        blob: 850243a82539
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.browser.test.tsx
        blob: 5a130278366d
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.test.tsx
        blob: cc68512d1f5d
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.tsx
        blob: b02e053aeaa1
      - path: source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.browser.test.tsx
        blob: 4bc48c3f4898
      - path: source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.test.tsx
        blob: 6b095f1c202b
      - path: source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.tsx
        blob: b3ac0d68fbfe
      - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.browser.test.tsx
        blob: c061939440d6
      - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.test.tsx
        blob: 9ce40d7e54a5
      - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
        blob: e43e8ca5f3db
      - path: source/react-ui/packages/ui/src/Dialog/Dialog.browser.test.tsx
        blob: 74edb97d9edc
      - path: source/react-ui/packages/ui/src/Dialog/Dialog.test.tsx
        blob: c35b6156c25e
      - path: source/react-ui/packages/ui/src/Dialog/Dialog.tsx
        blob: d59083d09cc6
      - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.browser.test.tsx
        blob: dd400766c407
      - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.test.tsx
        blob: fdc61c0e3df7
      - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.tsx
        blob: c42a426fe940
      - path: source/react-ui/packages/ui/src/Drawer/Drawer.browser.test.tsx
        blob: fe772946e34a
      - path: source/react-ui/packages/ui/src/Drawer/Drawer.test.tsx
        blob: 05e0fd965161
      - path: source/react-ui/packages/ui/src/Drawer/Drawer.tsx
        blob: 5ffdb91cb35e
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
        blob: ea49625f9b93
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.scope.browser.test.tsx
        blob: 44df08bd8fc2
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
        blob: d8bddb0fbbdc
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
        blob: 32f1c4b9889b
      - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.test.tsx
        blob: ecf081e3633f
      - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
        blob: ad93e06df9cc
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.browser.test.tsx
        blob: 84d8836de348
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.test.tsx
        blob: 433f2f735cdb
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.tsx
        blob: 25d61ecf7b19
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
        blob: f1d2dcc6f85a
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.test.tsx
        blob: 1defe0e919e2
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
        blob: 5d54f16c41a8
      - path: source/react-ui/packages/ui/src/FileInput/FileInput.browser.test.tsx
        blob: 76b541c0d749
      - path: source/react-ui/packages/ui/src/FileInput/FileInput.test.tsx
        blob: 013802125fae
      - path: source/react-ui/packages/ui/src/FileInput/FileInput.tsx
        blob: fe0ac66510ae
      - path: source/react-ui/packages/ui/src/FileInput/FileInputAnnouncer.tsx
        blob: dfe0710b3147
      - path: source/react-ui/packages/ui/src/FileInput/FileInputRow.tsx
        blob: 5c02c037a716
      - path: source/react-ui/packages/ui/src/FileInput/useFileUploads.test.tsx
        blob: 8f3949869a3b
      - path: source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx
        blob: 078a8597e9bb
      - path: source/react-ui/packages/ui/src/FormField/FormField.test.tsx
        blob: ff59ef7738b7
      - path: source/react-ui/packages/ui/src/FormField/FormField.tsx
        blob: 8674cdbfd205
      - path: source/react-ui/packages/ui/src/Grid/Grid.browser.test.tsx
        blob: 9815d77acfa8
      - path: source/react-ui/packages/ui/src/Grid/Grid.test.tsx
        blob: 8ad0fe846cff
      - path: source/react-ui/packages/ui/src/Grid/Grid.tsx
        blob: 5e826da97b84
      - path: source/react-ui/packages/ui/src/Grid/GridItem.tsx
        blob: d4d20d9980c3
      - path: source/react-ui/packages/ui/src/Inline/Inline.browser.test.tsx
        blob: a61564ab03d0
      - path: source/react-ui/packages/ui/src/Inline/Inline.test.tsx
        blob: c46784c0b672
      - path: source/react-ui/packages/ui/src/Inline/Inline.tsx
        blob: b6fbe2f5870f
      - path: source/react-ui/packages/ui/src/Link/Link.browser.test.tsx
        blob: 787af0e629b5
      - path: source/react-ui/packages/ui/src/Link/Link.test.tsx
        blob: 7571f8239311
      - path: source/react-ui/packages/ui/src/Link/Link.tsx
        blob: 41ad790bb170
      - path: source/react-ui/packages/ui/src/Menu/Menu.browser.test.tsx
        blob: b6f31a7a580b
      - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
        blob: 1b056934e1d1
      - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
        blob: b359e7b2394f
      - path: source/react-ui/packages/ui/src/Menu/MenuButton.tsx
        blob: 240cc4d9ff37
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.browser.test.tsx
        blob: 2502576b5864
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.test.tsx
        blob: 69508439cc03
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
        blob: 55b1b6e921cc
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.browser.test.tsx
        blob: d219aad49a1d
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.test.tsx
        blob: 19bd82b09156
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.tsx
        blob: b6de6099d0ca
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.test.tsx
        blob: e80c7ea7101f
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
        blob: 72989a581b25
      - path: source/react-ui/packages/ui/src/Popover/Popover.browser.test.tsx
        blob: a421f7eecc5d
      - path: source/react-ui/packages/ui/src/Popover/Popover.test.tsx
        blob: 7bbafc67cf6b
      - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
        blob: 9b43d6d0a650
      - path: source/react-ui/packages/ui/src/Progress/Progress.test.tsx
        blob: b84c7f481de6
      - path: source/react-ui/packages/ui/src/Progress/Progress.tsx
        blob: 08dcbd266f02
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.test.tsx
        blob: 4bf73f3232c0
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.tsx
        blob: 9017b64df455
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.test.tsx
        blob: 999734d3cf2a
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.tsx
        blob: 7fe883085688
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.browser.test.tsx
        blob: 54e48a60f377
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.test.tsx
        blob: c1070413e5c5
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.tsx
        blob: 04d9752b84a4
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
        blob: aa1f6ea0e459
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.test.tsx
        blob: 7e2ac5efa45b
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.tsx
        blob: c0aece0309d5
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.test.tsx
        blob: aed0e089f86e
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.tsx
        blob: 89964291a59e
      - path: source/react-ui/packages/ui/src/Slider/Slider.test.tsx
        blob: a56b303fd6ed
      - path: source/react-ui/packages/ui/src/Slider/Slider.tsx
        blob: 660cced8e09d
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.test.tsx
        blob: a2c69e78f3e0
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.tsx
        blob: 62162b88f650
      - path: source/react-ui/packages/ui/src/Stack/Stack.browser.test.tsx
        blob: f84672852a72
      - path: source/react-ui/packages/ui/src/Stack/Stack.test.tsx
        blob: a0878e79bffe
      - path: source/react-ui/packages/ui/src/Stack/Stack.tsx
        blob: e1d4bb4b7715
      - path: source/react-ui/packages/ui/src/StatePanel/EmptyIllustration.tsx
        blob: 59b3e79db9a7
      - path: source/react-ui/packages/ui/src/StatePanel/ErrorIllustration.tsx
        blob: 15f4f7236125
      - path: source/react-ui/packages/ui/src/StatePanel/NotFoundIllustration.tsx
        blob: 048f779b94ec
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.browser.test.tsx
        blob: cd8036f0f5b5
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.test.tsx
        blob: 5176ec0952d2
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.tsx
        blob: 8651efe57b98
      - path: source/react-ui/packages/ui/src/Table/Table.browser.test.tsx
        blob: 7a97cad1206b
      - path: source/react-ui/packages/ui/src/Table/Table.test.tsx
        blob: 95299262492d
      - path: source/react-ui/packages/ui/src/Table/Table.tsx
        blob: 6e8081b0d82e
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.test.tsx
        blob: 376c2779b18b
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.tsx
        blob: 66a23cea03bb
      - path: source/react-ui/packages/ui/src/Tag/Tag.browser.test.tsx
        blob: ed93811e2125
      - path: source/react-ui/packages/ui/src/Tag/Tag.test.tsx
        blob: 6e93033492d3
      - path: source/react-ui/packages/ui/src/Tag/Tag.tsx
        blob: cad45d058d6d
      - path: source/react-ui/packages/ui/src/TextField/TextField.test.tsx
        blob: 622dcd62e3ff
      - path: source/react-ui/packages/ui/src/TextField/TextField.tsx
        blob: 5e082e2f346f
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.browser.test.tsx
        blob: 8e717ee58496
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.test.tsx
        blob: ba8b7d02b3f7
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.tsx
        blob: f9b5fa7fef71
      - path: source/react-ui/packages/ui/src/Toast/ToastRegion.browser.test.tsx
        blob: 94975b192412
      - path: source/react-ui/packages/ui/src/Toast/ToastRegion.test.tsx
        blob: 619bde16c427
      - path: source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
        blob: 666de88dbac9
      - path: source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.browser.test.tsx
        blob: e58cdf42ca10
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.test.tsx
        blob: 3b252809287d
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.tsx
        blob: 50563385e52d
      - path: source/react-ui/packages/ui/src/Toolbar/Toolbar.browser.test.tsx
        blob: efaa74315cb6
      - path: source/react-ui/packages/ui/src/Toolbar/Toolbar.test.tsx
        blob: 9bb196215406
      - path: source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
        blob: 7885894a671a
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.test.tsx
        blob: 6d7816ce1597
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
        blob: 9fd74110850f
      - path: source/react-ui/packages/ui/src/Tree/Tree.browser.test.tsx
        blob: 0f7cd0569bd6
      - path: source/react-ui/packages/ui/src/Tree/Tree.test.tsx
        blob: a979def7e416
      - path: source/react-ui/packages/ui/src/Tree/Tree.tsx
        blob: b1dac9ae20e9
      - path: source/react-ui/packages/ui/src/Typography/Typography.test.tsx
        blob: d05673bc3fdc
      - path: source/react-ui/packages/ui/src/Typography/Typography.tsx
        blob: 2a60d82e22ec
      - path: source/react-ui/packages/ui/src/internal/listbox.browser.test.tsx
        blob: 3b178ae40e6b
      - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
        blob: a818c18a842f
      - path: source/react-ui/packages/ui/src/internal/overlayNesting.browser.test.tsx
        blob: 51735dd30f0e
      - path: source/react-ui/packages/ui/src/internal/overlayTree.test.tsx
        blob: 4383fd85e36b
      - path: source/react-ui/packages/ui/src/internal/overlayTree.tsx
        blob: 7bb167ba4704
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.browser.test.tsx
        blob: 499826d51e93
      - path: source/react-ui/packages/ui/src/internal/useOverlayRoot.test.tsx
        blob: 6ffc160ca8ee
      - path: source/react-ui/packages/ui/src/internal/useRovingFocus.browser.test.tsx
        blob: e2079ce69f14
      - path: source/react-ui/packages/ui/src/internal/useRovingFocus.test.tsx
        blob: b71aed71508d
  - path: source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
    blob: 5f097f26581d
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 869e816c7b00
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: 3675e69c484c
  - path: source/react-ui/packages/tokens/src/base-stylesheet.ts
    blob: efc73d4c829f
  - path: docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
    blob: b95f6963f69b
confidence: verified
---

U = `source/react-ui/packages/ui`, T = `source/react-ui/packages/tokens`.

No `var(--vpg-*)` read in `U/src` has a second argument. Every name a component reads is assigned
by `createTheme` (`T/src/theme.ts:135-310`; radius, size, icon, spacing, type and focus-ring
families at `:201-274`) or by the base stylesheet (`T/src/base-stylesheet.ts:14-19` dark
declarations, `:42-88` base `.vpg-root` rule). A regex search for `var\(--vpg-[a-z0-9-]+\s*,`
over `U/src` matches only the error message inside the enforcing test
(`no-fallback-var-reads.test.ts:42`). The rule is stated in `docs/adr/0009-*.md:15-19`.

**It is enforced by a test.** `U/src/no-fallback-var-reads.test.ts:17-21` reads every
`./**/*.{ts,tsx}` under `src` through `import.meta.glob(..., { query: "?raw" })`, excluding itself
(`:17`, why at `:14-15`), and fails on any line matching the fallback pattern (`:31-36`,
`:38-46`). Because the file list comes from a glob at run time, a fallback added in a component
that does not exist yet is still caught. It runs in the `jsdom` project, which is every
non-`*.browser.test.*` file (`U/vitest.config.ts:6` defines `browserTests`; the jsdom project excludes them at `:25-31`).
Layout primitives (ADR 0019) additionally write `--vpg-<primitive>-<prop>` inline so their stylesheets can read it bare,
which the same test covers. Line pointers into `T/src/theme.ts` and `base-stylesheet.ts` below were not re-checked after
those files changed; find the symbol by name. The pattern is assembled from parts
(`:25`, comment `:23-24`) so the test's own source cannot match it; keep it that way if you edit
the test. Why a test can read files this way rather than through `node:fs`:
[[tests-read-source-via-import-meta-glob-not-node-fs]].

A fallback is tempting because `var(--vpg-x, 8px)` renders the same whether or not anything
defines `--vpg-x`. That is how the library had built up fifty-four of them (`adr/0009:7`).

The fallbacks also disagreed with the scales, which made undoing them a visual change rather than
a refactor. For example, `--vpg-button-height-md` fell back to `2.25rem` (`adr/0009:43`), but the
size scale's `md` is `2rem` (`T/src/theme.ts:216`). Thirteen of the mappings move geometry
(`adr/0009:93`); the fifteen visible changes are listed at `adr/0009:144-185`, and the full mapping
table is at `adr/0009:32-89`.

A new component uses a scale step. If no step fits, there are two options:

- add a step to the scale, as was done for `size-2xl`, `icon-xl` and `font-size-5xl`
  (`adr/0009:224-227`)
- write a literal, with a reason, in the component's own stylesheet. Six container measurements
  already do this (`adr/0009:136-140`).

A `var()` fallback is never an option: it looks like a token but is not one.

**The literal carve-out covers container sizes only, not padding.** `adr/0009:136-140` names six
container measurements and says nothing about padding or gaps, so a literal padding or gap in a
component stylesheet is drift, not a sanctioned exception. `Dropdown` carries none: it composes
`FieldShell`, whose doc comment it repeats (`U/src/Dropdown/Dropdown.stylesheet.ts:17-21` names the
shell as owner of border, fill, corner radius, height, horizontal padding, focus ring, danger
border and hover fill). `FieldShell` reads `--vpg-size-md` and `padding: 0 var(--vpg-space-3)`
once (`U/src/FieldShell/FieldShell.stylesheet.ts:38-39`). The only `padding` declarations in
`Dropdown.stylesheet.ts` are the clear button's token read (`:112`) and a `padding: 0` in the
visually-hidden selection description (`:144`). ADR 0009 still names the since-deleted
`Autocomplete` in its tables (e.g. `adr/0009:52`); read those rows as history.

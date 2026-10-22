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
      - path: source/react-ui/packages/ui/src/Calendar/Calendar.stylesheet.ts
        blob: 6fb88dc89cce
      - path: source/react-ui/packages/ui/src/Calendar/calendarGrid.test.ts
        blob: c4507d1ecac8
      - path: source/react-ui/packages/ui/src/Calendar/calendarGrid.ts
        blob: 84586c2433fd
      - path: source/react-ui/packages/ui/src/Calendar/useCalendarFocus.ts
        blob: 440d8dacf5e1
      - path: source/react-ui/packages/ui/src/Card/Card.stylesheet.ts
        blob: 6f1685d3df13
      - path: source/react-ui/packages/ui/src/Center/Center.stylesheet.ts
        blob: be28a3b5dabc
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.stylesheet.ts
        blob: a10631e08c15
      - path: source/react-ui/packages/ui/src/ContextMenu/useContextMenuTriggers.ts
        blob: 667954cd817c
      - path: source/react-ui/packages/ui/src/DataTable/DataTable.stylesheet.ts
        blob: 12c2d51689ff
      - path: source/react-ui/packages/ui/src/DataTable/model.ts
        blob: 514208178bdd
      - path: source/react-ui/packages/ui/src/DataTable/rowCounts.ts
        blob: bfc673cc8bf1
      - path: source/react-ui/packages/ui/src/DataTable/types.ts
        blob: 39684f310c7e
      - path: source/react-ui/packages/ui/src/DataTable/useAvailableWidth.ts
        blob: aa9eba924a7e
      - path: source/react-ui/packages/ui/src/DataTable/useColumnSizing.test.ts
        blob: 6bfcc198bdda
      - path: source/react-ui/packages/ui/src/DataTable/useColumnSizing.ts
        blob: 9541b501ae20
      - path: source/react-ui/packages/ui/src/DataTable/useEndReached.ts
        blob: 4b8e7904ea89
      - path: source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
        blob: 08b92b0e958e
      - path: source/react-ui/packages/ui/src/DataTable/useRowWindow.ts
        blob: a29a15d63d60
      - path: source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
        blob: 8ff4d31cf430
      - path: source/react-ui/packages/ui/src/DataTable/useSortState.ts
        blob: cca8b092e12e
      - path: source/react-ui/packages/ui/src/DateField/DateField.stylesheet.ts
        blob: e71b27a5470f
      - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.test.ts
        blob: b15a360171d9
      - path: source/react-ui/packages/ui/src/DateField/dateFieldEditing.ts
        blob: 60031c032e37
      - path: source/react-ui/packages/ui/src/DateField/useComposedTyping.ts
        blob: 3c8a8d9e1956
      - path: source/react-ui/packages/ui/src/DateRangeField/DateRangeField.stylesheet.ts
        blob: 6b742cc4f5dc
      - path: source/react-ui/packages/ui/src/DateRangeField/dateRangeFieldModel.test.ts
        blob: d3c4315e309f
      - path: source/react-ui/packages/ui/src/DateRangeField/dateRangeFieldModel.ts
        blob: 29034feb7a0d
      - path: source/react-ui/packages/ui/src/DateRangeField/useDateRangeFieldState.ts
        blob: 7a1889196d09
      - path: source/react-ui/packages/ui/src/DateTimeField/DateTimeField.stylesheet.ts
        blob: a0a828d55e63
      - path: source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.test.ts
        blob: aa4a7c81dd57
      - path: source/react-ui/packages/ui/src/DateTimeField/dateTimeFieldModel.ts
        blob: a6836f6e4eb9
      - path: source/react-ui/packages/ui/src/DateTimeField/useDateTimeFieldState.ts
        blob: aa171354b637
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.stylesheet.ts
        blob: 813f4ceeb75d
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/dateTimeRangeFieldModel.test.ts
        blob: d1e5aee1e593
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/dateTimeRangeFieldModel.ts
        blob: 15b3c7bc2ec0
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/useDateTimeRangeFieldState.ts
        blob: f1012b554cba
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
        blob: c0b1aef2f2aa
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
      - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.stylesheet.ts
        blob: 7ab6f37faa6d
      - path: source/react-ui/packages/ui/src/RangeCalendar/rangeSelection.test.ts
        blob: 7fe7c34ea69e
      - path: source/react-ui/packages/ui/src/RangeCalendar/rangeSelection.ts
        blob: 7910193c0263
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.stylesheet.ts
        blob: 02577b9bbb3b
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.stylesheet.ts
        blob: 197833b1cf1a
      - path: source/react-ui/packages/ui/src/SideNav/sideNavContext.ts
        blob: b58729b35e7b
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.stylesheet.ts
        blob: d23d9836c3e2
      - path: source/react-ui/packages/ui/src/Slider/Slider.stylesheet.ts
        blob: 4e827709d87c
      - path: source/react-ui/packages/ui/src/Sparkline/Sparkline.stylesheet.ts
        blob: 123a7a94c04a
      - path: source/react-ui/packages/ui/src/Sparkline/geometry.test.ts
        blob: f97a4b747e29
      - path: source/react-ui/packages/ui/src/Sparkline/geometry.ts
        blob: 572724bd5f39
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.stylesheet.ts
        blob: 6ac87edea672
      - path: source/react-ui/packages/ui/src/Stack/Stack.stylesheet.ts
        blob: fc8e72b9343a
      - path: source/react-ui/packages/ui/src/StatTile/StatTile.stylesheet.ts
        blob: 20c80980cd10
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
      - path: source/react-ui/packages/ui/src/TimeField/TimeField.stylesheet.ts
        blob: 8f1b33fe07d2
      - path: source/react-ui/packages/ui/src/TimeField/timeFieldInput.ts
        blob: 601bf40926fc
      - path: source/react-ui/packages/ui/src/TimeField/timeFieldKeys.ts
        blob: e618d5ee76a9
      - path: source/react-ui/packages/ui/src/TimeField/timeSegments.test.ts
        blob: 47cb6c9694e2
      - path: source/react-ui/packages/ui/src/TimeField/timeSegments.ts
        blob: eb74f099909e
      - path: source/react-ui/packages/ui/src/TimeField/useTimeField.ts
        blob: 64d36c393b44
      - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.stylesheet.ts
        blob: 522bc9139911
      - path: source/react-ui/packages/ui/src/TimePanel/timePanelModel.test.ts
        blob: 04f102146e12
      - path: source/react-ui/packages/ui/src/TimePanel/timePanelModel.ts
        blob: 693f7f7d0eb2
      - path: source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.stylesheet.ts
        blob: efc585882143
      - path: source/react-ui/packages/ui/src/TimeRangeField/timeRangeFieldModel.test.ts
        blob: ab28479191bc
      - path: source/react-ui/packages/ui/src/TimeRangeField/timeRangeFieldModel.ts
        blob: 3b3fe98b4522
      - path: source/react-ui/packages/ui/src/TimeRangeField/useTimeRangeFieldState.ts
        blob: 3c78edce15c5
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
      - path: source/react-ui/packages/ui/src/TopNav/TopNav.stylesheet.ts
        blob: 4603dd0f681e
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
      - path: source/react-ui/packages/ui/src/internal/localRange.test.ts
        blob: 95b458f4dc82
      - path: source/react-ui/packages/ui/src/internal/localRange.ts
        blob: 656f0e5db19e
      - path: source/react-ui/packages/ui/src/internal/menuStylesheet.ts
        blob: 2f7269a1e45a
      - path: source/react-ui/packages/ui/src/internal/overflowCollapse.test.ts
        blob: 31db4312ad1b
      - path: source/react-ui/packages/ui/src/internal/overflowCollapse.ts
        blob: d776acd9b47d
      - path: source/react-ui/packages/ui/src/internal/paging.ts
        blob: 166da39fc128
      - path: source/react-ui/packages/ui/src/internal/space.test.ts
        blob: ab6c2bb8aa5b
      - path: source/react-ui/packages/ui/src/internal/space.ts
        blob: e6402bfd4321
      - path: source/react-ui/packages/ui/src/internal/useCalendarPopup.ts
        blob: 57b74f3ec40b
      - path: source/react-ui/packages/ui/src/internal/useClearRejectedOnExternalChange.ts
        blob: 5e257f50fd6b
      - path: source/react-ui/packages/ui/src/internal/useControllableState.ts
        blob: "617526263178"
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
        blob: 43fb480e5e70
      - path: source/react-ui/packages/ui/src/internal/useMediaQuery.ts
        blob: 13651ab2cfe6
      - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
        blob: 79d4d8cd4b40
      - path: source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
        blob: fc02602cbece
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
      - path: source/react-ui/packages/ui/src/Calendar/Calendar.browser.test.tsx
        blob: 30fc3212bbfb
      - path: source/react-ui/packages/ui/src/Calendar/Calendar.test.tsx
        blob: 23d7991dd13d
      - path: source/react-ui/packages/ui/src/Calendar/Calendar.tsx
        blob: f4430c30d6e9
      - path: source/react-ui/packages/ui/src/Calendar/CalendarCore.tsx
        blob: b25a269a6068
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
      - path: source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
        blob: 21f33e085ef2
      - path: source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
        blob: af9a54015bb6
      - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
        blob: 7315ea2c1173
      - path: source/react-ui/packages/ui/src/DataTable/DataTableBody.tsx
        blob: ad725d51f585
      - path: source/react-ui/packages/ui/src/DataTable/DataTableErrorRow.tsx
        blob: e9ca3358a0b3
      - path: source/react-ui/packages/ui/src/DataTable/DataTableHeaderCell.tsx
        blob: e6e2f798e15a
      - path: source/react-ui/packages/ui/src/DataTable/DataTableResizeHandle.tsx
        blob: ad75f28aea39
      - path: source/react-ui/packages/ui/src/DataTable/DataTableRow.tsx
        blob: 191936f8483a
      - path: source/react-ui/packages/ui/src/DataTable/DataTableSelectionControl.tsx
        blob: 676eacb46db0
      - path: source/react-ui/packages/ui/src/DataTable/DataTableSelectionHeaderCell.tsx
        blob: 9cfd7b450985
      - path: source/react-ui/packages/ui/src/DataTable/useAvailableWidth.test.tsx
        blob: 842497ece675
      - path: source/react-ui/packages/ui/src/DateField/DateField.browser.test.tsx
        blob: 91235a5c1cea
      - path: source/react-ui/packages/ui/src/DateField/DateField.test.tsx
        blob: 2650a5d13eab
      - path: source/react-ui/packages/ui/src/DateField/DateField.tsx
        blob: 385d2d7a892b
      - path: source/react-ui/packages/ui/src/DateField/useComposedTyping.test.tsx
        blob: f15c62bf29e1
      - path: source/react-ui/packages/ui/src/DateRangeField/DateRangeField.browser.test.tsx
        blob: 9f7f9fd4eb21
      - path: source/react-ui/packages/ui/src/DateRangeField/DateRangeField.test.tsx
        blob: f7cbe7bb2430
      - path: source/react-ui/packages/ui/src/DateRangeField/DateRangeField.tsx
        blob: 0f3cd41cb311
      - path: source/react-ui/packages/ui/src/DateTimeField/DateTimeField.browser.test.tsx
        blob: 1797d77c2126
      - path: source/react-ui/packages/ui/src/DateTimeField/DateTimeField.test.tsx
        blob: e2450852646b
      - path: source/react-ui/packages/ui/src/DateTimeField/DateTimeField.tsx
        blob: 4abe0527412a
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.browser.test.tsx
        blob: f65c80b98150
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.test.tsx
        blob: cd5f33ce7c06
      - path: source/react-ui/packages/ui/src/DateTimeRangeField/DateTimeRangeField.tsx
        blob: e861932d5b75
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
        blob: f7e5e5e0ebc8
      - path: source/react-ui/packages/ui/src/Drawer/Drawer.tsx
        blob: 2d2e1791caa0
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
        blob: 27db7cd0917b
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.scope.browser.test.tsx
        blob: 44df08bd8fc2
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
        blob: d8bddb0fbbdc
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
        blob: 2804658f786f
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
        blob: b52920478766
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.test.tsx
        blob: 58a42c6a93df
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
        blob: d2f31ecb23e9
      - path: source/react-ui/packages/ui/src/Menu/Menu.test.tsx
        blob: b03dce40c66f
      - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
        blob: d2a440c99893
      - path: source/react-ui/packages/ui/src/Menu/MenuButton.tsx
        blob: 240cc4d9ff37
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.browser.test.tsx
        blob: 2502576b5864
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.test.tsx
        blob: eda623b64c01
      - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
        blob: e59320800703
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.browser.test.tsx
        blob: d219aad49a1d
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.test.tsx
        blob: 19bd82b09156
      - path: source/react-ui/packages/ui/src/Pagination/Pagination.tsx
        blob: 9d805bd9dd6b
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.test.tsx
        blob: e80c7ea7101f
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
        blob: 72989a581b25
      - path: source/react-ui/packages/ui/src/Popover/Popover.browser.test.tsx
        blob: 4f296cdc6d95
      - path: source/react-ui/packages/ui/src/Popover/Popover.test.tsx
        blob: dfa5f4249ff7
      - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
        blob: e15783dc3f25
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
      - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.browser.test.tsx
        blob: 05d80644df06
      - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.test.tsx
        blob: 754664fae223
      - path: source/react-ui/packages/ui/src/RangeCalendar/RangeCalendar.tsx
        blob: 51a083a0786f
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.browser.test.tsx
        blob: 54e48a60f377
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.test.tsx
        blob: c1070413e5c5
      - path: source/react-ui/packages/ui/src/SegmentedControl/SegmentedControl.tsx
        blob: 04d9752b84a4
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
        blob: b6ab2b8b60fc
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.test.tsx
        blob: 6f9dbb379dd3
      - path: source/react-ui/packages/ui/src/SideNav/SideNav.tsx
        blob: ae479dddd2d3
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.test.tsx
        blob: aed0e089f86e
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.tsx
        blob: 89964291a59e
      - path: source/react-ui/packages/ui/src/Slider/Slider.test.tsx
        blob: a56b303fd6ed
      - path: source/react-ui/packages/ui/src/Slider/Slider.tsx
        blob: 660cced8e09d
      - path: source/react-ui/packages/ui/src/Sparkline/Sparkline.browser.test.tsx
        blob: f611752b1afa
      - path: source/react-ui/packages/ui/src/Sparkline/Sparkline.test.tsx
        blob: 372b9ea529c9
      - path: source/react-ui/packages/ui/src/Sparkline/Sparkline.tsx
        blob: 56828f272493
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
      - path: source/react-ui/packages/ui/src/StatTile/StatTile.browser.test.tsx
        blob: 5d8bb870372a
      - path: source/react-ui/packages/ui/src/StatTile/StatTile.test.tsx
        blob: 5491c3654341
      - path: source/react-ui/packages/ui/src/StatTile/StatTile.tsx
        blob: e470965a1d89
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
        blob: 2636238302c9
      - path: source/react-ui/packages/ui/src/Table/Table.test.tsx
        blob: b0fe6bad8e7f
      - path: source/react-ui/packages/ui/src/Table/Table.tsx
        blob: 5972c51673a9
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
      - path: source/react-ui/packages/ui/src/ThemeToggle/ThemeToggle.browser.test.tsx
        blob: 5ecbacb1ce4d
      - path: source/react-ui/packages/ui/src/ThemeToggle/ThemeToggle.test.tsx
        blob: 02e9bbb8f80e
      - path: source/react-ui/packages/ui/src/ThemeToggle/ThemeToggle.tsx
        blob: 0dac27b09ef0
      - path: source/react-ui/packages/ui/src/TimeField/TimeField.browser.test.tsx
        blob: 7dc69d95a92c
      - path: source/react-ui/packages/ui/src/TimeField/TimeField.test.tsx
        blob: 3455e311f3f0
      - path: source/react-ui/packages/ui/src/TimeField/TimeField.tsx
        blob: 4dc29d5a34da
      - path: source/react-ui/packages/ui/src/TimeField/TimeFieldSegment.tsx
        blob: 6bcd3f484b45
      - path: source/react-ui/packages/ui/src/TimeField/useTimeField.test.tsx
        blob: eb47cbd4b79e
      - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.browser.test.tsx
        blob: b207698e9c66
      - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.test.tsx
        blob: 4b76c8c69c23
      - path: source/react-ui/packages/ui/src/TimePanel/TimePanel.tsx
        blob: 836088e9b2a8
      - path: source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.browser.test.tsx
        blob: 98173942c398
      - path: source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.test.tsx
        blob: 608993e29d92
      - path: source/react-ui/packages/ui/src/TimeRangeField/TimeRangeField.tsx
        blob: 4c17d666a5cc
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
      - path: source/react-ui/packages/ui/src/TopNav/TopNav.browser.test.tsx
        blob: 87272349d6b3
      - path: source/react-ui/packages/ui/src/TopNav/TopNav.test.tsx
        blob: 321859101faa
      - path: source/react-ui/packages/ui/src/TopNav/TopNav.tsx
        blob: a234cf8ef7c2
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
        blob: 02d787a37486
      - path: source/react-ui/packages/ui/src/internal/overlayNesting.browser.test.tsx
        blob: 51735dd30f0e
      - path: source/react-ui/packages/ui/src/internal/overlayTree.test.tsx
        blob: 4383fd85e36b
      - path: source/react-ui/packages/ui/src/internal/overlayTree.tsx
        blob: 7bb167ba4704
      - path: source/react-ui/packages/ui/src/internal/useCalendarPopup.test.tsx
        blob: 6e12bea8185b
      - path: source/react-ui/packages/ui/src/internal/useClearRejectedOnExternalChange.test.tsx
        blob: 8c21d133c6db
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.browser.test.tsx
        blob: 499826d51e93
      - path: source/react-ui/packages/ui/src/internal/useMediaQuery.test.tsx
        blob: 183fd8ad8d6b
      - path: source/react-ui/packages/ui/src/internal/useOverlayRoot.test.tsx
        blob: 6ffc160ca8ee
      - path: source/react-ui/packages/ui/src/internal/useRovingFocus.browser.test.tsx
        blob: e2079ce69f14
      - path: source/react-ui/packages/ui/src/internal/useRovingFocus.test.tsx
        blob: b71aed71508d
  - path: source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
    blob: 5f097f26581d
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 6f09c94180b8
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: 14968a2aaad1
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
those files changed; find the symbol by name. The same goes for the test file and `vitest.config.ts`: the glob is still at
`:17-21`, but the pattern is built at the `fallbackPattern` line near `:26` and the config line numbers cited here have moved.
The test is line-based and scans comments, doc strings and test files too, so a comment quoting a fallback fails it; a
space before the comma (`var(--vpg-x , 1px)`) or a fallback on the following line would evade the regex and nothing else
enforces it. The pattern is assembled from parts
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

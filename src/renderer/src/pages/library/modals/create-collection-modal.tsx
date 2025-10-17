import { Modal } from "@renderer/components/modal/modal";
import { TextField } from "@renderer/components/text-field/text-field";
import { Button } from "@renderer/components/button/button";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback } from "react";
import { useCollections } from "@renderer/hooks";

import "./modals.scss";

interface CreateCollectionModalProps {
  visible: boolean;
  onClose: () => void;
  onCollectionCreated?: () => void;
}

interface FormValues {
  name: string;
}

export function CreateCollectionModal({
  visible,
  onClose,
  onCollectionCreated,
}: Readonly<CreateCollectionModalProps>) {
  const { t } = useTranslation("library");
  const { createCollection } = useCollections();

  const schema = yup.object({
    name: yup
      .string()
      .required(t("collection_name_required"))
      .min(1, t("collection_name_min_length")),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      try {
        await createCollection(values.name);
        onCollectionCreated?.();
        onClose();
        reset();
      } catch (error) {
        console.error("Failed to create collection:", error);
      }
    },
    [onClose, onCollectionCreated, createCollection, reset]
  );

  return (
    <Modal
      visible={visible}
      title={t("create_collection_title")}
      description={t("create_collection_description")}
      onClose={onClose}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="create-collection-modal"
      >
        <TextField
          {...register("name")}
          label={t("collection_name")}
          placeholder={t("collection_name_placeholder")}
          hint={errors.name?.message}
          error={errors.name?.message}
        />

        <Button type="submit" theme="primary" disabled={isSubmitting}>
          {t("create_collection")}
        </Button>
      </form>
    </Modal>
  );
}
